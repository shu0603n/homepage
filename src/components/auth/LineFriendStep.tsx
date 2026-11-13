// スタッフ登録後の「LINE 公式アカウントの友だち追加」案内（登録完了ページとマイページで使う）。
// ボタンのリンク先は lib/line-friend.ts で、サーバー側でログイン中の本人のスタッフ ID から作る

type Props = {
  href: string;
  linked: boolean; // 既に LINE と連携済みか（staff.line_user_id があるか）
  compact?: boolean; // マイページ用の小さい表示
};

// LINE 公式アカウントからできること
const LINE_FEATURES = [
  { icon: "bi-search", title: "お仕事検索", text: "LINE から求人を探せます" },
  { icon: "bi-wallet2", title: "給与の確認", text: "給与システムで確認できます" },
  { icon: "bi-chat-dots", title: "お問い合わせ", text: "ご質問やご相談を送れます" },
] as const;

function Features() {
  return (
    <ul className="line-step__features">
      {LINE_FEATURES.map((f) => (
        <li key={f.title}>
          <i className={`bi ${f.icon}`} aria-hidden="true" />
          <span>
            <strong>{f.title}</strong>
            {f.text}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function LineFriendStep({ href, linked, compact = false }: Props) {
  if (linked) {
    return (
      <div className={`line-step line-step--done${compact ? " line-step--compact" : ""}`}>
        <span className="line-step__badge">
          <i className="bi bi-check-circle-fill" aria-hidden="true" />
          LINE 連携済み
        </span>
        <p className="line-step__text">お仕事検索・給与の確認・お問い合わせは、LINE 公式アカウントからご利用いただけます。</p>
      </div>
    );
  }

  return (
    <div className={`line-step${compact ? " line-step--compact" : ""}`}>
      <p className="line-step__label">{compact ? "LINE 連携がまだお済みではありません" : "STEP 2"}</p>
      <h2 className="line-step__title">LINE 公式アカウントを友だち追加してください</h2>
      <p className="line-step__text">
        友だち追加すると、ご登録の情報と LINE が自動で連携され、
        <br className="pc-only" />
        LINE から次のことができるようになります。
      </p>
      <Features />
      <a className="line-step__btn" href={href} target="_blank" rel="noopener">
        <i className="bi bi-line" aria-hidden="true" />
        LINE で友だち追加する
        <span className="visually-hidden">（新しいタブで開きます）</span>
      </a>
      {!compact && <p className="line-step__note">※ LINE アプリが開き、ログインの確認が表示されることがあります。画面の案内に沿ってお進みください。</p>}
    </div>
  );
}
