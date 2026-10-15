import { Client, Storage } from "@taruvi/sdk";

export function storageFileUrl(client: Client, args: { bucket: string; path: string }): string {
  return new Storage(client).from(args.bucket).getUrl(args.path);
}

export function storageDownload(client: Client, args: { bucket: string; path: string }): Promise<Blob> {
  return new Storage(client).from(args.bucket).download(args.path).execute<Blob>();
}
