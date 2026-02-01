import Image from "next/image";

export interface LoadingScreenProps {
  /** Optional message below the spinner (e.g. "Loading settings…"). */
  message?: string;
}

/**
 * Single loading screen used everywhere: logo + spinner on light gradient.
 * Use in loading.tsx routes and in-page loading states.
 */
export default function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <div className="loadingScreenWrap" role="status" aria-label="Loading">
      <div className="loadingScreenInner">
        <Image
          src="/overlap_blue_no_text.png"
          alt=""
          width={80}
          height={80}
          priority
          className="loadingScreenLogo"
        />
        <span className="loadingScreenSpinner" aria-hidden />
        {message != null && message !== "" && (
          <p className="loadingScreenText">{message}</p>
        )}
      </div>
      <style>{`
        .loadingScreenWrap {
          position: fixed;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 24px;
          background: #eef0f7;
          background-image: linear-gradient(160deg, #f4f5fa 0%, #eef0f7 35%, #e6e9f4 100%);
          z-index: 9999;
        }
        .loadingScreenInner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }
        .loadingScreenLogo {
          display: block;
          flex-shrink: 0;
        }
        .loadingScreenSpinner {
          width: 28px;
          height: 28px;
          border: 3px solid rgba(15, 23, 42, 0.1);
          border-top-color: #2563eb;
          border-radius: 50%;
          animation: loadingScreenSpin 0.7s linear infinite;
        }
        @keyframes loadingScreenSpin {
          to { transform: rotate(360deg); }
        }
        .loadingScreenText {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: #5b6475;
        }
      `}</style>
    </div>
  );
}
