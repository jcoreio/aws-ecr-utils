import z from 'zod'

const MediaType = z.string().min(1)
const Size = z.number().int().nonnegative()
const Digest = z.string().min(32)

const LayerSchema = z.object({
  mediaType: MediaType,
  size: Size,
  digest: Digest,
})

export const ImageManifestSchema = z.object({
  schemaVersion: z.literal(2),
  mediaType: z.string(),
  config: LayerSchema,
  layers: z.array(LayerSchema),
})
export type ImageManifestSchema = z.infer<typeof ImageManifestSchema>
