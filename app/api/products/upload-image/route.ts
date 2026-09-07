import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { guardMutation, handleApiError } from "../../../../modules/security/api-guard";
import { ValidationError } from "../../../../modules/shared/errors";

export const runtime = "nodejs";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Sandbox stand-in for Supabase Storage (see FOUNDATION_SCHEMA.md
 * `product-media` bucket): writes into public/products/ on the local
 * filesystem. Fine for local/dev use; a real deployment would swap this
 * for a signed upload to object storage without touching the caller.
 */
export async function POST(request: NextRequest) {
  try {
    await guardMutation(request, "products.create");

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new ValidationError("An image file is required");
    }
    if (!ALLOWED_TYPES[file.type]) {
      throw new ValidationError("Image must be JPEG, PNG or WebP");
    }
    if (file.size > MAX_BYTES) {
      throw new ValidationError("Image must be 5MB or smaller");
    }

    const extension = ALLOWED_TYPES[file.type];
    const filename = `${randomUUID()}.${extension}`;
    const targetDir = path.join(process.cwd(), "public", "products");
    await mkdir(targetDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(targetDir, filename), buffer);

    return NextResponse.json({ url: `/products/${filename}` }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
