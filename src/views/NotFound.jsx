import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh', padding: 24, textAlign: 'center' }}>
      <div style={{ maxWidth: 480 }}>
        <div style={{ color: 'var(--accent-600)', fontSize: 14, letterSpacing: '.18em' }}>LITTLE WINS · 404</div>
        <h1 style={{ margin: '18px 0 12px', fontFamily: '"Noto Serif SC", serif', fontSize: 'clamp(2rem, 6vw, 4rem)', fontWeight: 500 }}>这张贴纸还没有写下</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 28 }}>没关系，回到看板继续看看那些已经发生的小小做到。</p>
        <Link to="/" style={{ display: 'inline-flex', padding: '12px 22px', borderRadius: 999, background: 'var(--text)', color: '#fff' }}>回到首页</Link>
      </div>
    </div>
  );
}
