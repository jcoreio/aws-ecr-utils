import z from 'zod'

const MediaType = z.string().min(1)
const Size = z.number().int().nonnegative()
const Digest = z.string().min(32)

const LayerSchema = z.object({
  mediaType: MediaType,
  size: Size,
  digest: Digest,
  platform: z
    .object({ architecture: z.string(), os: z.string() })
    .partial()
    .optional(),
})

export const ImageManifestSchema = z.object({
  schemaVersion: z.literal(2),
  mediaType: z.string(),
  manifests: z.array(LayerSchema).optional(),
  config: LayerSchema.optional(),
  layers: z.array(LayerSchema).optional(),
})
export type ImageManifestSchema = z.infer<typeof ImageManifestSchema>
