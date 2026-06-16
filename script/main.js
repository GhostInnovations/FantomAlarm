function toggleNav() {
      document.getElementById('siteNav').classList.toggle('collapse');
    }

    const scrollHero = document.querySelector('.scroll-hero');
    const introStorageKey = 'fantomIntroComplete';

    function clamp(value, min, max) {
      return Math.min(Math.max(value, min), max);
    }

    function smoothstep(edge0, edge1, value) {
      const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
      return x * x * (3 - 2 * x);
    }

    function heroEndPosition() {
      if (!scrollHero) return 0;
      return scrollHero.offsetTop + scrollHero.offsetHeight;
    }

    function introAlreadySeen() {
      try {
        return window.sessionStorage.getItem(introStorageKey) === 'true';
      } catch (error) {
        return false;
      }
    }

    function markIntroSeen() {
      try {
        window.sessionStorage.setItem(introStorageKey, 'true');
      } catch (error) {
        // Ignore storage errors in private browsing or locked-down browsers.
      }
    }

    function shouldSkipIntroOnLoad() {
      if (!scrollHero || window.location.hash) return false;
      return introAlreadySeen() && window.scrollY < heroEndPosition() - window.innerHeight * 0.12;
    }

    function skipPastIntro() {
      window.scrollTo({ top: heroEndPosition(), behavior: 'auto' });
    }

    function updateHeroAnimation() {
      if (!scrollHero) return;
      const travel = Math.max(scrollHero.offsetHeight - window.innerHeight, 1);
      const progress = clamp(-scrollHero.getBoundingClientRect().top / travel, 0, 1);
      const zoomProgress = smoothstep(0, 1, progress);
      const fadeProgress = smoothstep(0.68, 1, progress);

      scrollHero.style.setProperty('--hero-mask-scale', (1 + zoomProgress * 19).toFixed(3));
      scrollHero.style.setProperty('--hero-mask-opacity', (1 - fadeProgress).toFixed(3));
      scrollHero.style.setProperty('--hero-image-scale', (1.02 + progress * 0.05).toFixed(3));
      scrollHero.style.setProperty('--hero-image-brightness', (0.86 + progress * 0.22).toFixed(3));
      scrollHero.style.setProperty('--hero-hint-opacity', (1 - smoothstep(0, 0.24, progress)).toFixed(3));

      const isInsideReveal = progress < 0.99 && scrollHero.getBoundingClientRect().bottom > window.innerHeight * 0.1;
      document.body.classList.toggle('is-in-logo-reveal', isInsideReveal);

      if (progress >= 0.99) {
        markIntroSeen();
      }
    }

    if (shouldSkipIntroOnLoad()) {
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
      }
      skipPastIntro();
    }

    updateHeroAnimation();
    window.addEventListener('scroll', updateHeroAnimation, { passive: true });
    window.addEventListener('resize', () => {
      if (shouldSkipIntroOnLoad()) {
        skipPastIntro();
      }
      updateHeroAnimation();
    });

    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-6SE9CZSLQQ');
