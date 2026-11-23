import { NextRequest, NextResponse } from 'next/server';

const games: Record<string, string> = {
  men: 'b04016be-7292-41a8-8b2f-c2110424cff6',
  coed: '7b13835b-a44f-4005-aed3-02c920982ce2',
  over30: '02b66bde-65f9-4576-b111-a7081fe31580',
};

export function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  return context.params.then(({ slug }) => {
    const game = games[slug.toLowerCase()];
    if (!game) return NextResponse.redirect(new URL('/play', request.url));
    return NextResponse.redirect(new URL('/play?game=' + encodeURIComponent(game), request.url), 307);
  });
}
