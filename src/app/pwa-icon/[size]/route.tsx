import { ImageResponse } from "next/og";
import { Logo } from "@/components/Logo";

export const dynamic = "force-static";
export const generateStaticParams = () => [{ size: "192" }, { size: "512" }];

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: raw } = await params;
  const size = raw === "512" ? 512 : 192;
  return new ImageResponse(<Logo size={size} />, { width: size, height: size });
}
