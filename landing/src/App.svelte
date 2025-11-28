<script lang="ts">
  import { onMount } from 'svelte';

  // GitHub repo config
  const GITHUB_OWNER = 'ezcorp-org';
  const GITHUB_REPO = 'dup-detector';

  // Mouse spotlight
  let mouseX = $state(0);
  let mouseY = $state(0);

  function handleMouseMove(e: MouseEvent) {
    mouseX = e.clientX;
    mouseY = e.clientY;
  }

  type OS = 'mac' | 'windows' | 'linux' | 'unknown';
  type ReleaseAsset = {
    name: string;
    browser_download_url: string;
    size: number;
  };

  let userOS = $state<OS>('unknown');
  let latestVersion = $state<string>('');
  let downloadUrl = $state<string>('');
  let downloadFileName = $state<string>('');
  let allAssets = $state<ReleaseAsset[]>([]);
  let isLoading = $state(true);
  let email = $state('');
  let emailSubmitted = $state(false);
  let emailError = $state('');

  function detectOS(): OS {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('mac')) return 'mac';
    if (userAgent.includes('win')) return 'windows';
    if (userAgent.includes('linux')) return 'linux';
    return 'unknown';
  }

  function getAssetForOS(assets: ReleaseAsset[], os: OS): ReleaseAsset | null {
    const patterns: Record<OS, RegExp[]> = {
      mac: [/\.dmg$/i, /darwin.*\.tar\.gz$/i, /macos.*\.zip$/i],
      windows: [/\.msi$/i, /\.exe$/i, /windows.*\.zip$/i],
      linux: [/\.deb$/i, /\.AppImage$/i, /\.rpm$/i, /linux.*\.tar\.gz$/i],
      unknown: [],
    };

    for (const pattern of patterns[os]) {
      const match = assets.find((a) => pattern.test(a.name));
      if (match) return match;
    }
    return null;
  }

  async function fetchLatestRelease() {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`
      );
      if (!response.ok) {
        throw new Error('No releases found');
      }
      const data = await response.json();
      latestVersion = data.tag_name || data.name || 'Latest';
      allAssets = data.assets || [];

      const asset = getAssetForOS(allAssets, userOS);
      if (asset) {
        downloadUrl = asset.browser_download_url;
        downloadFileName = asset.name;
      }
    } catch (e) {
      console.log('Could not fetch releases:', e);
    } finally {
      isLoading = false;
    }
  }

  function handleDownload() {
    if (downloadUrl) {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = downloadFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  function selectDownload(asset: ReleaseAsset) {
    downloadUrl = asset.browser_download_url;
    downloadFileName = asset.name;
    handleDownload();
  }

  function formatSize(bytes: number): string {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  }

  async function handleEmailSubmit(e: Event) {
    e.preventDefault();
    emailError = '';

    if (!email || !email.includes('@')) {
      emailError = 'Please enter a valid email address';
      return;
    }

    console.log('Email submitted:', email);
    emailSubmitted = true;
    email = '';
  }

  const osNames: Record<OS, string> = {
    mac: 'macOS',
    windows: 'Windows',
    linux: 'Linux',
    unknown: 'your platform',
  };

  const features = [
    {
      label: 'Speed',
      title: 'Blazing fast',
      description:
        'Built with Rust for maximum performance. Scan 10,000+ files per second using smart hashing that only reads what\'s necessary.',
      icon: 'zap',
    },
    {
      label: 'Storage',
      title: 'Reclaim space',
      description:
        'Free up gigabytes of storage by identifying duplicate files you no longer need.',
      icon: 'hard-drive',
    },
    {
      label: 'Safety',
      title: 'You\'re in control',
      description:
        'Duplicates are found, not automatically deleted. You decide what stays and what goes.',
      icon: 'shield',
    },
    {
      label: 'Platform',
      title: 'Works everywhere',
      description:
        'Native apps for Mac, Windows, and Linux. Same great experience on every platform.',
      icon: 'layers',
    },
  ];

  const testimonials = [
    {
      quote:
        "I blinked and it was done. Scanned my entire photo library before my coffee finished brewing.",
      author: 'Impatient Developer',
    },
    {
      quote:
        'Finally, a duplicate finder that doesn\'t make me feel like I need a PhD to use it.',
      author: 'Regular Human',
    },
    {
      quote:
        'Freed up 47GB on my drive. That\'s like... a lot of photos I forgot I had three copies of.',
      author: 'Photo Hoarder',
    },
  ];

  onMount(() => {
    userOS = detectOS();
    fetchLatestRelease();
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="min-h-screen relative" onmousemove={handleMouseMove}>
  <!-- Mouse spotlight -->
  <div
    class="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300"
    style="background: radial-gradient(600px circle at {mouseX}px {mouseY}px, rgba(139, 92, 246, 0.06), transparent 40%)"
  ></div>
  <!-- Header -->
  <header class="fixed top-0 left-0 right-0 z-50 bg-bg-primary/80 backdrop-blur-md border-b border-border">
    <nav class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
      <a href="/" class="font-medium text-lg tracking-tight flex items-center gap-2.5">
        <div class="w-8 h-8 relative">
          <svg viewBox="0 0 32 32" fill="none" class="w-full h-full">
            <!-- Back document -->
            <g opacity="0.4">
              <path d="M6 4h10l6 6v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z" fill="currentColor" class="text-accent"/>
              <path d="M16 4v4a2 2 0 002 2h4" fill="currentColor" class="text-accent" opacity="0.6"/>
            </g>
            <!-- Front document -->
            <g>
              <path d="M12 8h10l6 6v12a2 2 0 01-2 2H12a2 2 0 01-2-2V10a2 2 0 012-2z" fill="currentColor" class="text-accent"/>
              <path d="M22 8v4a2 2 0 002 2h4" fill="currentColor" class="text-accent-hover" opacity="0.8"/>
              <!-- Lines -->
              <rect x="13" y="18" width="10" height="1.5" rx="0.75" fill="white" opacity="0.3"/>
              <rect x="13" y="21.5" width="8" height="1.5" rx="0.75" fill="white" opacity="0.3"/>
              <rect x="13" y="25" width="6" height="1.5" rx="0.75" fill="white" opacity="0.3"/>
            </g>
          </svg>
        </div>
        <span class="text-white">Dup Detector</span>
      </a>
      <div class="hidden md:flex items-center gap-8 text-sm">
        <a href="#features" class="text-zinc-400 hover:text-white transition-colors">Features</a>
        <a href="#speed" class="text-zinc-400 hover:text-white transition-colors">Performance</a>
        <a href="#testimonials" class="text-zinc-400 hover:text-white transition-colors">Testimonials</a>
      </div>
      <a
        href={`https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`}
        target="_blank"
        rel="noopener"
        class="px-4 py-2 rounded-lg border border-border hover:border-border-hover hover:bg-white/5 text-sm text-zinc-300 transition-all"
      >
        View on GitHub
      </a>
    </nav>
  </header>

  <!-- Hero -->
  <section class="pt-32 pb-24 px-6 relative overflow-hidden">
    <!-- Subtle gradient background -->
    <div class="absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-transparent pointer-events-none"></div>
    <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-accent/10 rounded-full blur-[120px] pointer-events-none"></div>

    <div class="max-w-4xl mx-auto text-center relative">
      <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium mb-8">
        <span class="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
        Free & Open Source
      </div>

      <h1 class="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
        Find duplicates<br />
        <span class="text-accent">Fast.</span>
      </h1>

      <p class="text-lg md:text-xl text-zinc-400 mb-12 max-w-2xl mx-auto leading-relaxed">
        A free, open source desktop app to detect duplicate files and reclaim your drive space.
        No complex menus. No subscriptions. No tracking. Just results.
      </p>

      <div class="flex flex-col items-center gap-4">
        {#if isLoading}
          <button
            disabled
            class="px-8 py-4 bg-bg-card text-zinc-500 rounded-xl font-medium cursor-wait"
          >
            Checking for latest version...
          </button>
        {:else if downloadUrl}
          <button
            onclick={handleDownload}
            class="group px-8 py-4 bg-accent hover:bg-accent-hover text-white rounded-xl font-medium transition-all flex items-center gap-3 shadow-lg shadow-accent/25"
          >
            <svg class="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download for {osNames[userOS]}
          </button>
          <span class="text-sm text-zinc-500">
            {latestVersion} &middot; {downloadFileName}
          </span>
        {:else}
          <a
            href={`https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`}
            target="_blank"
            rel="noopener"
            class="px-8 py-4 bg-accent hover:bg-accent-hover text-white rounded-xl font-medium transition-colors shadow-lg shadow-accent/25"
          >
            View Downloads
          </a>
        {/if}

        {#if allAssets.length > 1}
          <details class="text-sm text-zinc-500 mt-2">
            <summary class="cursor-pointer hover:text-zinc-300 transition-colors">
              Other platforms
            </summary>
            <div class="mt-4 flex flex-wrap justify-center gap-2">
              {#each allAssets as asset}
                <button
                  onclick={() => selectDownload(asset)}
                  class="px-4 py-2 bg-bg-card hover:bg-bg-elevated border border-border hover:border-border-hover rounded-lg text-xs transition-all"
                >
                  {asset.name}
                  <span class="text-zinc-600 ml-1">({formatSize(asset.size)})</span>
                </button>
              {/each}
            </div>
          </details>
        {/if}
      </div>

      <p class="mt-10 text-sm text-zinc-600">
        Available for macOS, Windows & Linux
      </p>
    </div>
  </section>

  <!-- Speed Highlight -->
  <section id="speed" class="py-20 px-6 bg-bg-secondary border-y border-border">
    <div class="max-w-5xl mx-auto">
      <div class="grid md:grid-cols-2 gap-12 items-center">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium mb-6">
            Performance
          </div>
          <h2 class="text-3xl md:text-4xl font-bold mb-4">
            Built for speed
          </h2>
          <p class="text-zinc-400 leading-relaxed mb-6">
            Written in Rust for native performance. Smart hashing compares file sizes first,
            then partial content, only fully hashing when necessary.
          </p>
          <ul class="space-y-3">
            <li class="flex items-center gap-3 text-sm text-zinc-300">
              <div class="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center">
                <svg class="w-3 h-3 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              Multi-threaded scanning
            </li>
            <li class="flex items-center gap-3 text-sm text-zinc-300">
              <div class="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center">
                <svg class="w-3 h-3 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              Smart partial hashing
            </li>
            <li class="flex items-center gap-3 text-sm text-zinc-300">
              <div class="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center">
                <svg class="w-3 h-3 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              Minimal memory footprint
            </li>
          </ul>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="p-6 rounded-2xl bg-bg-card border border-border">
            <div class="font-mono text-4xl font-bold text-accent mb-2">10k+</div>
            <div class="text-sm text-zinc-500">files per second</div>
          </div>
          <div class="p-6 rounded-2xl bg-bg-card border border-border">
            <div class="font-mono text-4xl font-bold text-accent mb-2">&lt;1s</div>
            <div class="text-sm text-zinc-500">typical scan time</div>
          </div>
          <div class="p-6 rounded-2xl bg-bg-card border border-border">
            <div class="font-mono text-4xl font-bold text-accent mb-2">100%</div>
            <div class="text-sm text-zinc-500">free forever</div>
          </div>
          <div class="p-6 rounded-2xl bg-bg-card border border-border">
            <div class="font-mono text-4xl font-bold text-accent mb-2">0</div>
            <div class="text-sm text-zinc-500">auto-deleted files</div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Features -->
  <section id="features" class="py-24 px-6">
    <div class="max-w-5xl mx-auto">
      <div class="text-center mb-16">
        <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium mb-6">
          Features
        </div>
        <h2 class="text-3xl md:text-4xl font-bold mb-4">What we do</h2>
        <p class="text-zinc-400 max-w-xl mx-auto">
          Simple tools that do one thing well. Find duplicates, reclaim your space.
        </p>
      </div>

      <div class="grid md:grid-cols-2 gap-6">
        {#each features as feature}
          <div class="group p-6 rounded-2xl bg-bg-card border border-border hover:border-accent/30 transition-all">
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent/20 transition-colors">
                {#if feature.icon === 'zap'}
                  <svg class="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                {:else if feature.icon === 'hard-drive'}
                  <svg class="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                  </svg>
                {:else if feature.icon === 'shield'}
                  <svg class="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                {:else if feature.icon === 'layers'}
                  <svg class="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                {/if}
              </div>
              <div>
                <div class="text-xs text-accent font-medium mb-1">{feature.label}</div>
                <h3 class="text-lg font-semibold mb-2 text-white">{feature.title}</h3>
                <p class="text-zinc-400 text-sm leading-relaxed">{feature.description}</p>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Open Source -->
  <section class="py-24 px-6 bg-bg-secondary border-y border-border">
    <div class="max-w-5xl mx-auto">
      <div class="grid md:grid-cols-2 gap-12 items-center">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium mb-6">
            Open Source
          </div>
          <h2 class="text-3xl md:text-4xl font-bold mb-4">
            Fully transparent
          </h2>
          <p class="text-zinc-400 leading-relaxed mb-6">
            Dup Detector is 100% open source. Inspect the code, suggest improvements,
            or build your own version. No hidden trackers, no telemetry, no surprises.
          </p>
          <div class="flex flex-wrap gap-3">
            <a
              href={`https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`}
              target="_blank"
              rel="noopener"
              class="inline-flex items-center gap-2 px-5 py-2.5 bg-bg-card border border-border hover:border-accent/30 rounded-xl text-sm font-medium transition-all"
            >
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              View on GitHub
            </a>
            <a
              href={`https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/issues`}
              target="_blank"
              rel="noopener"
              class="inline-flex items-center gap-2 px-5 py-2.5 text-zinc-400 hover:text-white text-sm font-medium transition-colors"
            >
              Report an issue
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
          </div>
        </div>
        <div class="grid grid-cols-1 gap-4">
          <div class="p-5 rounded-2xl bg-bg-card border border-border flex items-start gap-4">
            <div class="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div>
              <h3 class="font-semibold text-white mb-1">Fully auditable</h3>
              <p class="text-zinc-400 text-sm">Every line of code is public. See exactly what runs on your machine.</p>
            </div>
          </div>
          <div class="p-5 rounded-2xl bg-bg-card border border-border flex items-start gap-4">
            <div class="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h3 class="font-semibold text-white mb-1">Privacy first</h3>
              <p class="text-zinc-400 text-sm">No analytics, no telemetry, no data collection. Your files stay yours.</p>
            </div>
          </div>
          <div class="p-5 rounded-2xl bg-bg-card border border-border flex items-start gap-4">
            <div class="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h3 class="font-semibold text-white mb-1">Community driven</h3>
              <p class="text-zinc-400 text-sm">Built by developers, for everyone. Contributions welcome.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Testimonials -->
  <section id="testimonials" class="py-24 px-6">
    <div class="max-w-5xl mx-auto">
      <div class="text-center mb-16">
        <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium mb-6">
          Testimonials
        </div>
        <h2 class="text-3xl md:text-4xl font-bold mb-4">What people say</h2>
      </div>

      <div class="grid md:grid-cols-3 gap-6">
        {#each testimonials as testimonial}
          <div class="p-6 rounded-2xl bg-bg-card border border-border">
            <svg class="w-8 h-8 text-accent/30 mb-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
            </svg>
            <p class="text-zinc-300 text-sm leading-relaxed mb-4">{testimonial.quote}</p>
            <p class="text-zinc-500 text-xs font-medium">— {testimonial.author}</p>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Email Signup -->
  <section class="py-24 px-6">
    <div class="max-w-lg mx-auto text-center">
      <h2 class="text-2xl md:text-3xl font-bold mb-4">Stay updated</h2>
      <p class="text-zinc-400 text-sm mb-8">
        Get notified about new features and releases. No spam, ever.
      </p>

      {#if emailSubmitted}
        <div class="p-4 bg-accent/10 border border-accent/20 rounded-xl text-accent text-sm">
          Thanks! We'll keep you posted.
        </div>
      {:else}
        <form onsubmit={handleEmailSubmit} class="flex gap-3">
          <input
            type="email"
            bind:value={email}
            placeholder="you@example.com"
            class="flex-1 px-4 py-3 bg-bg-card border border-border rounded-xl text-sm focus:outline-none focus:border-accent/50 transition-colors placeholder:text-zinc-600"
          />
          <button
            type="submit"
            class="px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-xl font-medium text-sm transition-colors whitespace-nowrap"
          >
            Notify me
          </button>
        </form>
        {#if emailError}
          <p class="mt-3 text-red-400 text-sm">{emailError}</p>
        {/if}
      {/if}
    </div>
  </section>

  <!-- CTA -->
  <section class="py-24 px-6 border-t border-border">
    <div class="max-w-2xl mx-auto text-center">
      <h2 class="text-3xl md:text-4xl font-bold mb-4">Ready to reclaim your space?</h2>
      <p class="text-zinc-400 mb-10">Download Dup Detector and find those duplicates in seconds.</p>

      {#if downloadUrl}
        <button
          onclick={handleDownload}
          class="group px-8 py-4 bg-accent hover:bg-accent-hover text-white rounded-xl font-medium transition-all inline-flex items-center gap-3 shadow-lg shadow-accent/25"
        >
          <svg class="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Now
        </button>
      {:else}
        <a
          href={`https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`}
          target="_blank"
          rel="noopener"
          class="px-8 py-4 bg-accent hover:bg-accent-hover text-white rounded-xl font-medium transition-colors inline-block shadow-lg shadow-accent/25"
        >
          Download Now
        </a>
      {/if}
    </div>
  </section>

  <!-- Footer -->
  <footer class="py-12 px-6 border-t border-border bg-bg-secondary">
    <div class="max-w-6xl mx-auto">
      <div class="flex flex-col md:flex-row items-center justify-between gap-6">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 relative">
            <svg viewBox="0 0 32 32" fill="none" class="w-full h-full">
              <!-- Back document -->
              <g opacity="0.4">
                <path d="M6 4h10l6 6v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z" fill="currentColor" class="text-accent"/>
                <path d="M16 4v4a2 2 0 002 2h4" fill="currentColor" class="text-accent" opacity="0.6"/>
              </g>
              <!-- Front document -->
              <g>
                <path d="M12 8h10l6 6v12a2 2 0 01-2 2H12a2 2 0 01-2-2V10a2 2 0 012-2z" fill="currentColor" class="text-accent"/>
                <path d="M22 8v4a2 2 0 002 2h4" fill="currentColor" class="text-accent-hover" opacity="0.8"/>
                <!-- Lines -->
                <rect x="13" y="18" width="10" height="1.5" rx="0.75" fill="white" opacity="0.3"/>
                <rect x="13" y="21.5" width="8" height="1.5" rx="0.75" fill="white" opacity="0.3"/>
                <rect x="13" y="25" width="6" height="1.5" rx="0.75" fill="white" opacity="0.3"/>
              </g>
            </svg>
          </div>
          <div>
            <div class="font-medium text-white">Dup Detector</div>
            <div class="text-xs text-zinc-500">Free & Open Source</div>
          </div>
        </div>

        <div class="flex items-center gap-8 text-sm">
          <a
            href={`https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`}
            target="_blank"
            rel="noopener"
            class="text-zinc-400 hover:text-white transition-colors"
          >
            GitHub
          </a>
          <span class="text-zinc-700">Don't Follow</span>
        </div>
      </div>

      <div class="mt-8 pt-8 border-t border-border text-center text-xs text-zinc-600">
        &copy; {new Date().getFullYear()} Dup Detector. All rights reserved.
      </div>
    </div>
  </footer>
</div>
