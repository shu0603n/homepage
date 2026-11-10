// 募集ページのポイントを右から左へ流す帯（エンドレスループ）
// 同じ並びを4回続けて置き、全体の半分（2回分）だけ左へ動かしたら最初に戻す。
// 2回分あれば横に広い画面でも右端が途切れず、戻した瞬間も同じ見た目なのでつなぎ目が見えない。
// 読み上げは1回目だけ（2回目以降は aria-hidden）
export function Marquee({ items, label = "募集のポイント" }: { items: string[]; label?: string }) {
  return (
    <div className="marquee" aria-label={label}>
      <div className="marquee__track">
        {[0, 1, 2, 3].flatMap((copy) =>
          items.map((text) => (
            <span key={`${copy}-${text}`} aria-hidden={copy > 0 ? true : undefined}>
              {text}
            </span>
          )),
        )}
      </div>
    </div>
  );
}
