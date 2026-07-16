import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

// Animation phases:
// 0: "YOUR KIDS DON'T WANT YOUR STUFF" visible (3 sec)
// 1: Fades out (1 sec)
// 2: 2 sec pause
// 3: "But" cuts in, then word by word every 0.5s
// 4: Phrases fade in one by one, 2s apart
// 5: All phrases + it's not stuff it's fade out (1 sec)
// 6: But + History remain, "Fades" cuts in, holds 3 sec
// 7: But History Fades fade out (1 sec)
// 8: 1 sec pause
// 9: Bed slides to center (1 sec)
// 10: 2 sec pause
// 11: YOUR KIDS DON'T WANT YOUR STUFF appears, stays

const ARTBOARD_W = 1400;
const ARTBOARD_H = 900;

const notoSerif = 'Noto Serif, serif';
const bebasNeue = 'Bebas Neue, sans-serif';

export default function LandingPage() {
  const [time, setTime] = useState(0);
  const [animDone, setAnimDone] = useState(false);
  const startRef = useRef(null);
  const rafRef = useRef(null);

  // Scale to fit viewport (whichever dimension is smaller)
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const updateScale = () => {
      const scaleW = window.innerWidth / ARTBOARD_W;
      const scaleH = (window.innerHeight - 80) / ARTBOARD_H;
      setScale(Math.min(scaleW, scaleH));
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  // Auto-play timer
  useEffect(() => {
    if (animDone) return;
    const animate = (timestamp) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = (timestamp - startRef.current) / 1000; // seconds
      setTime(elapsed);
      // Animation ends at ~28 seconds
      if (elapsed < 28) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setAnimDone(true);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animDone]);

  // Timeline (all times in seconds):
  // 0.0 - 3.0:  YOUR KIDS visible
  // 3.0 - 4.0:  YOUR KIDS fades out
  // 4.0 - 6.0:  pause
  // 6.0:        "But" cuts in
  // 6.5:        "it's" cuts in
  // 7.0:        "not" cuts in
  // 7.5:        "stuff" cuts in
  // 8.0:        "it's" cuts in
  // 8.5:        "History" cuts in
  // 9.0:        phrase 1 fades in
  // 11.0:       phrase 2 fades in
  // 13.0:       phrase 3 fades in
  // 15.0:       phrase 4 fades in
  // 17.0:       phrase 5 fades in
  // 19.0:       phrases + it's not stuff it's fade out (1 sec)
  // 20.0:       But + History remain, "Fades" cuts in
  // 23.0:       But + History + Fades fade out (1 sec)
  // 24.0:       pause 1 sec
  // 25.0:       bed slides to center (1 sec)
  // 27.0:       pause 2 sec (bed settled at 26s, wait until 27s... but we wait 2s after bed done)
  // Actually bed done at 26s, pause 2s = 28s... let's shift:
  // 25.0: bed slides (1 sec, done at 26)
  // 26.0: wait 2 sec
  // 28.0: YOUR KIDS appears, stays

  const fade = (start, duration, dir = 'in') => {
    if (dir === 'in') {
      return Math.min(Math.max((time - start) / duration, 0), 1);
    } else {
      return Math.min(Math.max(1 - (time - start) / duration, 0), 1);
    }
  };

  // Opening YOUR KIDS: visible 0-3, fade out 3-4
  const openingOpacity = time < 3 ? 1 : fade(3, 1, 'out');

  // But it's not stuff it's History - word by word cut-ins
  const wordTimes = { But: 6.0, its1: 6.5, not: 7.0, stuff: 7.5, its2: 8.0, History: 8.5 };
  
  // Words that fade out at 19s (it's not stuff it's) — 1 sec fade
  // "But" and "History" stay until 23s
  const wordOpacity = (word) => {
    const appear = wordTimes[word];
    if (time < appear) return 0;
    // Words that fade out with phrases at 19s
    if (['its1', 'not', 'stuff', 'its2'].includes(word)) {
      if (time >= 19) return fade(19, 1, 'out');
    }
    // But and History fade out at 23s
    if (time >= 23) return fade(23, 1, 'out');
    return 1;
  };

  // "Fades" word - appears at 20s, fades out at 23s
  const fadesOpacity = time < 20 ? 0 : time < 23 ? 1 : fade(23, 1, 'out');

  // 5 phrases - fade in at 9, 11, 13, 15, 17. Fade out at 19s
  const phraseOpacity = (index) => {
    const appearTime = 9 + index * 2;
    if (time < appearTime) return 0;
    if (time >= 19) return fade(19, 1, 'out');
    return fade(appearTime, 0.5, 'in');
  };

  // Bed position: slides from x:0 to x:380 between 25-26s
  const bedProgress = Math.min(Math.max((time - 25) / 1, 0), 1);
  // Ease in-out
  const eased = bedProgress < 0.5 ? 2 * bedProgress * bedProgress : 1 - Math.pow(-2 * bedProgress + 2, 2) / 2;
  const bedX = 0 + (380 - 0) * eased;
  const bedY = 160;

  // Final YOUR KIDS appears at 28s, stays
  const finalOpacity = time >= 28 ? 1 : 0;

  const phrases = [
    { text: "Great-grandmother's wedding gift", x: 710, y: 80 },
    { text: "Where Grandpa was born",           x: 924, y: 166 },
    { text: "Dad fell off and chipped a tooth", x: 832, y: 454 },
    { text: "Where I took naps",                x: 714, y: 527 },
    { text: "Smells like grandma's perfume",    x: 850, y: 610 },
  ];

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Noto+Serif&display=swap" rel="stylesheet" />

      <div className="bg-white min-h-screen">
        {/* Fixed Header */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#B8A888]" style={{ height: '80px' }}>
          <div className="max-w-[1400px] mx-auto px-12 h-full flex justify-between items-center">
            <div className="flex items-baseline tracking-widest">
              <span className="text-3xl font-medium" style={{ fontFamily: 'Roboto, sans-serif' }}>keep</span>
              <span className="text-3xl italic" style={{ fontFamily: 'Merriweather, serif' }}>seek</span>
            </div>
            <nav className="flex gap-8 items-center">
              <Link to="/curator" className="text-base hover:opacity-70 transition-opacity" style={{ fontFamily: 'Roboto, sans-serif' }}>Keeper Login</Link>
              <Link to="/viewer" className="text-base italic hover:opacity-70 transition-opacity" style={{ fontFamily: 'Merriweather, serif' }}>Seeker Portal</Link>
            </nav>
          </div>
        </header>

        {/* Animation Stage - true 1400x900, no padding */}
        <div style={{ paddingTop: '80px' }}>
          <div style={{
            width: `${ARTBOARD_W * scale}px`,
            height: `${ARTBOARD_H * scale}px`,
            position: 'relative',
            overflow: 'hidden',
            margin: '0 auto',
            padding: 0,
          }}>
            {/* Inner artboard - exact 1400x900, positions match Illustrator 1:1 */}
            <div style={{
              width: `${ARTBOARD_W}px`,
              height: `${ARTBOARD_H}px`,
              position: 'absolute',
              top: 0,
              left: 0,
              padding: 0,
              margin: 0,
              transformOrigin: 'top left',
              transform: `scale(${scale})`,
            }}>

              {/* BED */}
              <div style={{
                position: 'absolute',
                left: `${bedX}px`,
                top: `${bedY}px`,
                width: '714px',
                transition: 'none',
              }}>
                <img
                  src="https://res.cloudinary.com/dg5pprmpg/image/upload/v1771090095/Untitled-5_vgudm9.png"
                  alt="Antique bed"
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
              </div>

              {/* OPENING: YOUR KIDS DON'T WANT YOUR STUFF */}
              <div style={{ opacity: openingOpacity, transition: 'opacity 1s' }}>
                <p style={{ position: 'absolute', left: '244px', top: '37px',  fontFamily: bebasNeue, fontSize: '200pt', lineHeight: '250pt', fontWeight: 400, margin: 0 }}>YOUR KIDS</p>
                <p style={{ position: 'absolute', left: '560px', top: '287px', fontFamily: bebasNeue, fontSize: '200pt', lineHeight: '250pt', fontWeight: 400, margin: 0 }}>DON'T WANT</p>
                <p style={{ position: 'absolute', left: '369px', top: '537px', fontFamily: bebasNeue, fontSize: '200pt', lineHeight: '250pt', fontWeight: 400, margin: 0 }}>YOUR STUFF</p>
              </div>

              {/* BUT IT'S NOT STUFF IT'S HISTORY — word by word */}
              {/* Line 1: "But it's not stuff" at x:714 y:253 */}
              {/* Line 2: "it's History" at x:714 y:353 */}
              <span style={{ position: 'absolute', left: '714px', top: '253px', fontFamily: notoSerif, fontSize: '65pt', lineHeight: '90pt', fontWeight: 400, opacity: wordOpacity('But') }}>But&nbsp;</span>
              <span style={{ position: 'absolute', left: '838px', top: '253px', fontFamily: notoSerif, fontSize: '65pt', lineHeight: '90pt', fontWeight: 400, opacity: wordOpacity('its1') }}>it's&nbsp;</span>
              <span style={{ position: 'absolute', left: '950px', top: '253px', fontFamily: notoSerif, fontSize: '65pt', lineHeight: '90pt', fontWeight: 400, opacity: wordOpacity('not') }}>not&nbsp;</span>
              <span style={{ position: 'absolute', left: '1060px', top: '253px', fontFamily: notoSerif, fontSize: '65pt', lineHeight: '90pt', fontWeight: 400, opacity: wordOpacity('stuff') }}>stuff</span>
              <span style={{ position: 'absolute', left: '714px', top: '353px', fontFamily: notoSerif, fontSize: '65pt', lineHeight: '90pt', fontWeight: 400, opacity: wordOpacity('its2') }}>it's&nbsp;</span>
              <span style={{ position: 'absolute', left: '838px', top: '353px', fontFamily: notoSerif, fontSize: '65pt', lineHeight: '90pt', fontWeight: 400, opacity: wordOpacity('History') }}>History</span>

              {/* FADES */}
              <span style={{ position: 'absolute', left: '987px', top: '561px', fontFamily: notoSerif, fontSize: '65pt', lineHeight: '90pt', fontWeight: 400, opacity: fadesOpacity }}>Fades</span>

              {/* 5 PHRASES */}
              {phrases.map((phrase, i) => (
                <p key={i} style={{
                  position: 'absolute',
                  left: `${phrase.x}px`,
                  top: `${phrase.y}px`,
                  fontFamily: notoSerif,
                  fontSize: '24pt',
                  fontWeight: 400,
                  margin: 0,
                  opacity: phraseOpacity(i),
                  transition: 'opacity 0.5s',
                  whiteSpace: 'nowrap',
                }}>
                  {phrase.text}
                </p>
              ))}

              {/* FINAL: YOUR KIDS DON'T WANT YOUR STUFF */}
              <div style={{ opacity: finalOpacity }}>
                <p style={{ position: 'absolute', left: '404px', top: '37px',  fontFamily: bebasNeue, fontSize: '200pt', lineHeight: '250pt', fontWeight: 400, margin: 0 }}>YOUR KIDS</p>
                <p style={{ position: 'absolute', left: '124px', top: '287px', fontFamily: bebasNeue, fontSize: '200pt', lineHeight: '250pt', fontWeight: 400, margin: 0 }}>DON'T</p>
                <p style={{ position: 'absolute', left: '938px', top: '287px', fontFamily: bebasNeue, fontSize: '200pt', lineHeight: '250pt', fontWeight: 400, margin: 0 }}>WANT</p>
                <p style={{ position: 'absolute', left: '361px', top: '537px', fontFamily: bebasNeue, fontSize: '200pt', lineHeight: '250pt', fontWeight: 400, margin: 0 }}>YOUR STUFF</p>
              </div>

            </div>
          </div>

          {/* Rest of landing page content - scrolls normally below animation */}
          <div className="bg-white">
            <div className="max-w-[1200px] mx-auto px-12 pt-20 pb-32">
              <div className="flex items-center justify-center gap-20">
                <div className="w-[400px] flex-shrink-0">
                  <img src="https://res.cloudinary.com/dg5pprmpg/image/upload/v1771090095/Untitled-5_vgudm9.png" alt="Antique bed" className="w-full rounded-sm" />
                </div>
                <div className="max-w-xs">
                  <p className="text-lg leading-relaxed" style={{ fontFamily: 'Georgia, serif' }}>
                    But the things you leave behind or have been left to you are where the stories are; where the family history is held. Getting rid of grandma's bed means losing the place where your father was born and where you took naps when you were little.
                  </p>
                </div>
              </div>
            </div>
            <div className="w-full">
              <img src="https://res.cloudinary.com/dg5pprmpg/image/upload/v1771096711/Screenshot_2026-02-14_at_2.18.22_PM_wgwlim.png" alt="Collection" className="w-full h-auto" />
            </div>
            <div className="border-t border-[#B8A888] mt-32"></div>
          </div>
        </div>
      </div>
    </>
  );
}
