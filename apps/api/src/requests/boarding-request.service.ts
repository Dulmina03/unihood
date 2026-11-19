import {BadRequestException,ConflictException,ForbiddenException,Injectable,Inject,NotFoundException} from '@nestjs/common';
import {createHash,randomUUID} from 'node:crypto';
import {
  BOARDING_REQUEST_POLICY_VERSION,
  BoardingRequestInputSchema,
  BoardingRequestReceiptSchema,
  BoardingRequestStatusViewSchema,
  type ActorContext,
  type BoardingRequestReceipt,
  type BoardingRequestStatusView,
  type PermissionService,
} from '@unihood/contracts';
import {PERMISSION_SERVICE} from '../identity/tokens';
import {UniversityRepository} from '../universities/university.repository';

type Query = (sql: string, values: unknown[]) => Promise<Record<string, unknown>[]>;
type Row = Record<string, unknown>;
const requester = 'synthetic:contributor';
const date = `to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS created_at`;
const columns = `id,boarding_id,kind,status,data_kind,${date}`;

@Injectable()
export class BoardingRequestService {
  constructor(
    private readonly repository: UniversityRepository,
    @Inject(PERMISSION_SERVICE) private readonly permissions: PermissionService,
  ) {}

  private async actorId(actor: ActorContext) {
    if (!this.repository.includeSynthetic || actor.authStatus !== 'LOCAL_TEST_ACTOR' || actor.actorId !== requester || !(await this.permissions.canSuggestPlace(actor))) {
      throw new ForbiddenException();
    }
    return requester;
  }

  private async eligible(query: Query, boardingId: string, kind: 'CONTACT_OWNER' | 'REQUEST_LOCATION') {
    const rows = await query(
      `SELECT a.visibility FROM public.boarding_advertisement_previews a
       JOIN public.listings l ON l.id=a.listing_id AND l.boarding_id=a.boarding_id
       JOIN public.boarding_properties b ON b.place_id=a.boarding_id
       JOIN public.places p ON p.id=b.place_id
       WHERE p.id=$1 AND p.kind='BOARDING' AND p.status='ACTIVE' AND p.merged_into IS NULL
       AND p.data_kind='SYNTHETIC' AND b.data_kind='SYNTHETIC' AND a.data_kind='SYNTHETIC'
       AND l.is_current AND l.publication_status='PUBLISHED' AND b.visibility=a.visibility AND l.visibility_snapshot=a.visibility
       AND l.publisher_kind='OWNER_OFFICIAL' AND b.authorization_status='LOCAL_TEST_AUTHORIZED'
       AND (a.visibility='HIDDEN' OR (b.locality_consent AND b.general_locality=a.locality))`,
      [boardingId],
    );
    if (!rows.length) throw new NotFoundException();
    if (kind === 'REQUEST_LOCATION' && rows[0].visibility === 'PUBLIC_MAP') throw new BadRequestException();
  }

  private statusView(row: Row): BoardingRequestStatusView {
    return BoardingRequestStatusViewSchema.parse({
      requestId: row.id,
      boardingId: row.boarding_id,
      kind: row.kind,
      status: row.status,
      policyVersion: BOARDING_REQUEST_POLICY_VERSION,
      synthetic: true,
      ownerNotified: false,
      locationDisclosed: false,
      dataKind: row.data_kind,
      createdAt: row.created_at,
    });
  }

  private receipt(row: Row, duplicate: boolean): BoardingRequestReceipt {
    return BoardingRequestReceiptSchema.parse({ ...this.statusView(row), duplicate });
  }

  async create(actor: ActorContext, value: unknown) {
    const requesterRef = await this.actorId(actor);
    const input = BoardingRequestInputSchema.parse(value);
    const payloadHash = createHash('sha256').update(`boarding-request-v1:${input.boardingId}:${input.kind}`).digest('hex');
    return this.repository.transaction(async (query) => {
      await query('SELECT pg_advisory_xact_lock(44046,1)', []);
      await this.eligible(query, input.boardingId, input.kind);
      const previous = await query(`SELECT ${columns},payload_hash FROM unihood_private.boarding_requests WHERE requester_ref=$1 AND request_key=$2`, [requesterRef, input.requestKey]);
      if (previous.length) {
        if (previous[0].payload_hash !== payloadHash) throw new ConflictException();
        return this.receipt(previous[0], true);
      }
      const duplicate = await query(`SELECT ${columns} FROM unihood_private.boarding_requests WHERE requester_ref=$1 AND boarding_id=$2 AND kind=$3`, [requesterRef, input.boardingId, input.kind]);
      if (duplicate.length) return this.receipt(duplicate[0], true);
      const requestId = randomUUID();
      await query(
        `INSERT INTO unihood_private.boarding_requests(id,requester_ref,boarding_id,kind,request_key,payload_hash)
         VALUES($1,$2,$3,$4,$5,$6)`,
        [requestId, requesterRef, input.boardingId, input.kind, input.requestKey, payloadHash],
      );
      const created = await query(`SELECT ${columns} FROM unihood_private.boarding_requests WHERE id=$1`, [requestId]);
      if (!created.length) throw new Error('Request receipt unavailable');
      return this.receipt(created[0], false);
    });
  }

  async status(actor: ActorContext, requestId: string) {
    const requesterRef = await this.actorId(actor);
    const rows = await this.repository.query(`SELECT ${columns} FROM unihood_private.boarding_requests WHERE id=$1 AND requester_ref=$2`, [requestId, requesterRef]);
    if (!rows.length) throw new NotFoundException();
    return this.statusView(rows[0]);
  }
}
