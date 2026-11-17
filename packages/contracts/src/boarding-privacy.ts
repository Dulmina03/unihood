import {z} from 'zod';
import {PublicIdSchema,paginatedSchema} from './rest';
export const MAX_MEDIA_BYTES=5*1024*1024;
export const MAX_MEDIA_ASSETS=20;
export const MediaUploadInputSchema=z.strictObject({requestKey:PublicIdSchema,consent:z.literal('true')});
// OpenAPI binary fields describe transport; runtime uses bounded Multer + decoder checks.
export const MediaBinarySchema=z.string().meta({format:'binary'});
export const OwnerMediaUploadBodySchema=MediaUploadInputSchema.extend({image:MediaBinarySchema});
export const OwnerContactReceiptSchema=z.strictObject({id:PublicIdSchema,revision:z.number().int().positive(),synthetic:z.literal(true),publicAvailable:z.literal(false)});
export const PrivacyRevisionInputSchema=z.strictObject({expectedRevision:z.number().int().min(1).max(2147483646)});
export const OwnerMediaItemSchema=z.strictObject({id:PublicIdSchema,requestKey:PublicIdSchema,revision:z.number().int().positive(),synthetic:z.literal(true),state:z.enum(['STAGING','ACTIVE','REVOKED']),previewAllowed:z.boolean(),mime:z.literal('image/webp'),bytes:z.number().int().positive().max(MAX_MEDIA_BYTES),width:z.number().int().min(1).max(2048),height:z.number().int().min(1).max(2048),consent:z.enum(['GRANTED','REVOKED']),moderation:z.enum(['PENDING','REJECTED']),metadata:z.literal('STRIPPED'),cleanupPending:z.boolean(),createdAt:z.iso.datetime({offset:true})}).refine(v=>v.previewAllowed===(v.state==='ACTIVE')&&(v.state==='REVOKED'?(v.consent==='REVOKED'&&v.moderation==='REJECTED'):(v.consent==='GRANTED'&&v.moderation==='PENDING'&&!v.cleanupPending)),'Invalid quarantine state');
export const OwnerMediaPageSchema=paginatedSchema(OwnerMediaItemSchema);
export type OwnerMediaItem=z.infer<typeof OwnerMediaItemSchema>;
export const OwnerMediaReceiptSchema=z.strictObject({id:PublicIdSchema,assetId:PublicIdSchema,revision:z.number().int().positive(),synthetic:z.literal(true),published:z.literal(false),cleanupPending:z.boolean()});
// Reserved NANPA fiction block; no real contact collection/verification before final policy.
export const SYNTHETIC_PHONE='+12025550100';
export const OwnerPrivateContactInputSchema=z.strictObject({expectedRevision:z.number().int().min(0).max(2147483646),contactFixture:z.literal('fictional-contact-a'),publicConsent:z.boolean(),privacyAcknowledged:z.literal(true)});
export type OwnerPrivateContactInput=z.infer<typeof OwnerPrivateContactInputSchema>;
export const OwnerPrivateContactSchema=z.strictObject({id:PublicIdSchema,synthetic:z.literal(true),revision:z.number().int().nonnegative(),state:z.enum(['ABSENT','PRIVATE','REMOVED']),maskedPhone:z.literal('•••0100').nullable(),publicConsent:z.boolean(),verification:z.literal('UNVERIFIED'),publicAvailable:z.literal(false),encryptionConfigured:z.boolean(),readable:z.boolean()}).refine(v=>v.state==='ABSENT'?(v.revision===0&&v.maskedPhone===null&&!v.publicConsent&&v.readable):v.state==='REMOVED'?(v.revision>0&&v.maskedPhone===null&&!v.publicConsent&&v.readable):(v.revision>0&&(v.readable?v.maskedPhone==='•••0100':v.maskedPhone===null)),'Invalid private contact state');
export type OwnerPrivateContact=z.infer<typeof OwnerPrivateContactSchema>;
export const OwnerPrivacyOverviewSchema=z.strictObject({id:PublicIdSchema,synthetic:z.literal(true),maxBytes:z.literal(MAX_MEDIA_BYTES),maxAssets:z.literal(MAX_MEDIA_ASSETS),storageConfigured:z.boolean(),encryptionConfigured:z.boolean(),scanner:z.literal('NOT_CONFIGURED'),publicMediaDelivery:z.literal('DISABLED'),publicContactDelivery:z.literal('DISABLED')});
export const BoardingPrivacyEventTypeSchema=z.enum(['MEDIA_UPLOAD_STAGED','MEDIA_QUARANTINED','MEDIA_CONSENT_REVOKED','PRIVATE_CONTACT_SET','PRIVATE_CONTACT_REMOVED']);
export const OwnerPrivacyEventSchema=z.strictObject({id:PublicIdSchema,event:BoardingPrivacyEventTypeSchema,assetId:PublicIdSchema.nullable(),occurredAt:z.iso.datetime({offset:true})});
export const OwnerPrivacyEventPageSchema=paginatedSchema(OwnerPrivacyEventSchema);
