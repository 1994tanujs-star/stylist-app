// Code-generated "flat-lay" layout: arranges the look's item photos in a
// styled mood-board composition. No AI image generation involved (free).

const PLACEHOLDER = (label) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><rect width='100%' height='100%' fill='#ece6df'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='#a39c92'>${label}</text></svg>`
  )}`;

function ItemImage({ item, className }) {
  const src = item.photo_url || PLACEHOLDER(item.category || 'item');
  return (
    <div className={`bg-white rounded-xl shadow-md overflow-hidden flex items-center justify-center ${className}`}>
      <img src={src} alt={item.name} className="object-cover w-full h-full" />
    </div>
  );
}

export default function FlatLay({ items, layout = 'stacked' }) {
  const tops = items.filter((i) => i.category === 'top' || i.category === 'dress');
  const bottoms = items.filter((i) => i.category === 'bottom');
  const others = items.filter((i) => !['top', 'dress', 'bottom'].includes(i.category));

  if (layout === 'sidebyside') {
    return (
      <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-gradient-to-br from-(--color-blush) to-(--color-cream)">
        {items.map((item) => (
          <ItemImage key={item.id} item={item} className="aspect-square" />
        ))}
      </div>
    );
  }

  if (layout === 'spread') {
    return (
      <div className="relative p-6 rounded-2xl bg-gradient-to-br from-(--color-sage) to-(--color-cream) min-h-[320px]">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            {tops[0] && <ItemImage item={tops[0]} className="aspect-[4/3]" />}
          </div>
          <div className="col-span-1 flex flex-col gap-3">
            {others.map((item) => <ItemImage key={item.id} item={item} className="aspect-square" />)}
          </div>
          <div className="col-span-3">
            {bottoms[0] && <ItemImage item={bottoms[0]} className="aspect-[3/2]" />}
          </div>
        </div>
      </div>
    );
  }

  // default: stacked
  return (
    <div className="flex flex-col gap-3 p-4 rounded-2xl bg-gradient-to-b from-(--color-blush) to-(--color-cream)">
      {tops.map((item) => <ItemImage key={item.id} item={item} className="aspect-[5/4]" />)}
      {bottoms.map((item) => <ItemImage key={item.id} item={item} className="aspect-[5/3]" />)}
      {others.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {others.map((item) => <ItemImage key={item.id} item={item} className="aspect-square" />)}
        </div>
      )}
    </div>
  );
}
