import Image from "next/image";

export default function Loading() {
  return (
    <div className="globalLoader" role="status" aria-label="Loading">
      <div className="globalLoaderInner">
        <Image
          src="/overlap_blue_no_text.png"
          alt=""
          width={80}
          height={80}
          priority
          className="globalLoaderLogo"
        />
        <span className="globalLoaderSpinner" aria-hidden />
      </div>
    </div>
  );
}
