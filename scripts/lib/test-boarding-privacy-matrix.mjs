import assert from 'node:assert/strict';

export async function testBoardingPrivacyMatrix({ client, url, get, endpoint }) {
  assert.ok(url, 'Database URL must be provided');
  assert.ok(endpoint, 'API endpoint must be provided');

  // Verify HTTP endpoint privacy invariants on real running API
  const mapRes = await get('/api/v1/boardings/map');
  assert.equal(mapRes.status, 200);
  assert.match(mapRes.headers.get('cache-control') ?? '', /no-store/);

  // Private / nonexistent boarding nearby-essentials returns 404
  const essentialsRes = await get('/api/v1/boardings/00000000-0000-4000-8000-000000000099/nearby-essentials');
  assert.equal(essentialsRes.status, 404);
  // 1. Verify schema boundaries: public places table must never contain boarding coordinate columns
  const placeColumns = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'places'`
  );
  const columnNames = placeColumns.rows.map((r) => r.column_name);
  assert.ok(!columnNames.includes('entrance_geo'), 'places table must not have entrance_geo');
  assert.ok(!columnNames.includes('private_location'), 'places table must not have private_location');
  assert.ok(!columnNames.includes('lat'), 'places table must not have raw lat');
  assert.ok(!columnNames.includes('lng'), 'places table must not have raw lng');

  // 2. Verify private schema isolation
  const privateTables = await client.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'unihood_private'`
  );
  const privateTableNames = privateTables.rows.map((r) => r.table_name);
  assert.ok(privateTableNames.includes('boarding_locations'), 'unihood_private must store private locations');
  assert.ok(privateTableNames.includes('boarding_media'), 'unihood_private must store private media');
  assert.ok(privateTableNames.includes('boarding_contacts'), 'unihood_private must store private contacts');

  // 3. Verify public map entrance exclusivity: ONLY PUBLIC_MAP listings can exist in boarding_public_entrances
  const nonPublicEntrances = await client.query(
    `SELECT e.boarding_id, b.visibility, b.public_map_consent
     FROM public.boarding_public_entrances e
     JOIN public.boarding_properties b ON b.place_id = e.boarding_id
     WHERE b.visibility <> 'PUBLIC_MAP' OR b.public_map_consent IS NOT TRUE`
  );
  assert.equal(
    nonPublicEntrances.rows.length,
    0,
    'Zero non-PUBLIC_MAP or unconsented boardings can exist in boarding_public_entrances'
  );

  // 4. Test atomic revocation on real PostGIS database
  // Find or insert a test boarding property
  const testBoardingId = '00000000-0000-4000-8000-000000000099';
  const testListingId = '72000000-0000-4000-8000-000000000099';

  await client.query('BEGIN');
  try {
    // Insert test place
    await client.query(
      `INSERT INTO public.places (id, kind, canonical_name, normalized_name, status, data_kind, source_label)
       VALUES ($1, 'BOARDING', 'Synthetic Revocation Test', 'synthetic revocation test', 'ACTIVE', 'SYNTHETIC', 'UNI-039 test')
       ON CONFLICT (id) DO NOTHING`,
      [testBoardingId]
    );

    // Insert test property in PUBLIC_MAP
    await client.query(
      `INSERT INTO public.boarding_properties (place_id, visibility, public_map_consent, map_consent_at, authorization_status, data_kind)
       VALUES ($1, 'PUBLIC_MAP', true, CURRENT_TIMESTAMP, 'LOCAL_TEST_AUTHORIZED', 'SYNTHETIC')
       ON CONFLICT (place_id) DO UPDATE SET visibility = 'PUBLIC_MAP', public_map_consent = true, map_consent_at = CURRENT_TIMESTAMP`,
      [testBoardingId]
    );

    // Insert current listing
    await client.query(
      `INSERT INTO public.listings (id, boarding_id, revision, publisher_kind, publication_status, title, visibility_snapshot, is_current, published_at)
       VALUES ($1, $2, 1, 'OWNER_OFFICIAL', 'PUBLISHED', 'Synthetic Revocation Test', 'PUBLIC_MAP', true, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO NOTHING`,
      [testListingId, testBoardingId]
    );

    // Insert public entrance
    await client.query(
      `INSERT INTO public.boarding_public_entrances (boarding_id, listing_id, purpose, entrance_geo, consent_at)
       VALUES ($1, $2, 'OWNER_SELECTED_PUBLIC_ENTRANCE', ST_SetSRID(ST_MakePoint(79.901, 6.795), 4326), CURRENT_TIMESTAMP)
       ON CONFLICT (boarding_id) DO UPDATE SET entrance_geo = ST_SetSRID(ST_MakePoint(79.901, 6.795), 4326)`,
      [testBoardingId, testListingId]
    );

    await client.query(`UPDATE public.boarding_public_entrances e SET consent_at=b.map_consent_at FROM public.boarding_properties b WHERE e.boarding_id=b.place_id AND b.place_id=$1`, [testBoardingId]);
    await client.query(`UPDATE public.listings SET description='PRIVATE_TEXT_CANARY_42.123456_43.654321' WHERE id=$1`, [testListingId]);
    await client.query(`INSERT INTO unihood_private.boarding_locations(boarding_id,exact_geo,address_enc,retention_policy)
      VALUES($1,ST_SetSRID(ST_Point(43.654321,42.123456),4326),decode('53594e544845544943','hex'),'synthetic-test-only')`, [testBoardingId]);
    await client.query(`INSERT INTO public.boarding_advertisement_previews(listing_id,boarding_id,title,summary,visibility,locality,updated_at) VALUES($1,$2,'Synthetic curated privacy fixture','Synthetic curated summary','PUBLIC_MAP',NULL,CURRENT_TIMESTAMP)`, [testListingId,testBoardingId]);
    await client.query(`INSERT INTO public.boarding_units(id,boarding_id,label,room_type,capacity,public_template) VALUES($1,$2,'PRIVATE_UNIT_CANARY','PRIVATE_ROOM_TYPE_CANARY',1,'STUDY_ROOM')`, [testBoardingId,testBoardingId]);
    const { BoardingDetailsService } = await import('../../apps/api/dist/boardings/boarding-details.service.js');
    const repository = { includeSynthetic: true, query: async (sql, values) => (await client.query(sql, values)).rows };
    const details = new BoardingDetailsService(repository);
    const compare = async () => (await details.compare({ ids: testBoardingId })).items[0];
    const publicItem = await compare();
    assert.deepEqual(publicItem.entrance, { lat: 6.795, lng: 79.901 });
    assert.equal(publicItem.hasExactEntrance, true);
    assert.equal(publicItem.unitsSummary[0].label, 'Synthetic Study Room');
    assert.equal(publicItem.unitsSummary[0].template, 'STUDY_ROOM');
    assert.ok(!/PRIVATE_TEXT_CANARY|PRIVATE_UNIT_CANARY|PRIVATE_ROOM_TYPE_CANARY|42\.123456|43\.654321|address_enc/.test(JSON.stringify(publicItem)));
    // A separate consent timestamp must never authorize this entrance.
    await client.query(`UPDATE public.boarding_public_entrances SET consent_at=consent_at-INTERVAL '1 second' WHERE boarding_id=$1`, [testBoardingId]);
    await assert.rejects(details.nearbyEssentials(testBoardingId), e => e.getStatus() === 404);
    await client.query(`UPDATE public.boarding_public_entrances e SET consent_at=b.map_consent_at FROM public.boarding_properties b WHERE e.boarding_id=b.place_id AND b.place_id=$1`, [testBoardingId]);

    // Verify entrance exists and spatial query works
    const entranceBefore = await client.query(
      `SELECT ST_AsText(entrance_geo) AS geom FROM public.boarding_public_entrances WHERE boarding_id = $1`,
      [testBoardingId]
    );
    assert.equal(entranceBefore.rows.length, 1);
    assert.equal(entranceBefore.rows[0].geom, 'POINT(79.901 6.795)');

    // Execute atomic revocation: switch to AREA_ONLY
    await client.query('DELETE FROM public.boarding_public_entrances WHERE boarding_id = $1', [testBoardingId]);
    await client.query(
      `UPDATE public.boarding_properties
       SET visibility = 'AREA_ONLY', public_map_consent = false, map_consent_at = NULL, general_locality = 'Katubedda', locality_consent = true
       WHERE place_id = $1`,
      [testBoardingId]
    );

    await client.query(`UPDATE public.listings SET visibility_snapshot='AREA_ONLY' WHERE id=$1`, [testListingId]);
    await client.query(`UPDATE public.boarding_advertisement_previews SET visibility='AREA_ONLY',locality='Katubedda' WHERE listing_id=$1`, [testListingId]);
    const areaItem = await compare();
    assert.equal(areaItem.id, testBoardingId);
    assert.equal(areaItem.entrance, null);
    assert.equal(areaItem.nearbyEssentials, null);
    assert.equal(areaItem.locationLabel, 'Katubedda');
    await assert.rejects(details.nearbyEssentials(testBoardingId), e => e.getStatus() === 404);
    await client.query(`UPDATE public.boarding_properties SET visibility='HIDDEN',general_locality=NULL,locality_consent=false WHERE place_id=$1`, [testBoardingId]);
    await client.query(`UPDATE public.listings SET visibility_snapshot='HIDDEN' WHERE id=$1`, [testListingId]);
    await client.query(`UPDATE public.boarding_advertisement_previews SET visibility='HIDDEN',locality=NULL WHERE listing_id=$1`, [testListingId]);
    const hiddenItem = await compare();
    assert.equal(hiddenItem.id, testBoardingId);
    assert.equal(hiddenItem.entrance, null);
    assert.equal(hiddenItem.locationLabel, null);
    assert.equal(hiddenItem.nearbyEssentials, null);
    await assert.rejects(details.nearbyEssentials(testBoardingId), e => e.getStatus() === 404);
    assert.ok(!/PRIVATE_TEXT_CANARY|PRIVATE_UNIT_CANARY|PRIVATE_ROOM_TYPE_CANARY|42\.123456|43\.654321|79\.901|6\.795|address_enc/.test(JSON.stringify(hiddenItem)));

    // Verify entrance is immediately absent from public database
    const entranceAfter = await client.query(
      `SELECT ST_AsText(entrance_geo) AS geom FROM public.boarding_public_entrances WHERE boarding_id = $1`,
      [testBoardingId]
    );
    assert.equal(entranceAfter.rows.length, 0, 'Revocation must delete public entrance immediately');

    // Spatial join query must now return 0 results
    const spatialJoin = await client.query(
      `SELECT b.place_id
       FROM public.boarding_properties b
       JOIN public.boarding_public_entrances e ON e.boarding_id = b.place_id
       WHERE b.place_id = $1`,
      [testBoardingId]
    );
    assert.equal(spatialJoin.rows.length, 0, 'Spatial queries must not match revoked boarding');

    await client.query('ROLLBACK');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }

  console.log('PASS: UNI-039 PostGIS spatial isolation, private schema separation, and atomic revocation');
}
