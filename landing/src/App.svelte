<script lang="ts">
  import { onMount } from 'svelte';

  // GitHub repo config - update this to match your repo
  const GITHUB_OWNER = 'your-username';
  const GITHUB_REPO = 'dup-detector';

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

    // In production, you'd send this to your backend
    // For now, we'll just simulate success
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
      title: 'Blazing Fast',
      description:
        'Built with Rust for maximum performance. Scan 10,000+ files per second using smart hashing algorithms that only read what\'s necessary.',
      icon: 'zap',
    },
    {
      title: 'Reclaim Drive Space',
      description:
        'Free up gigabytes of storage by identifying and removing duplicate files you no longer need.',
      icon: 'hard-drive',
    },
    {
      title: 'Safe & Predictable',
      description:
        'Duplicates are found, not automatically deleted. You remain in complete control of what stays and what goes.',
      icon: 'shield',
    },
    {
      title: 'Cross Platform',
      description:
        'Works on Mac, Windows, and Linux. Same great experience everywhere.',
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

<div class="min-h-screen">
  <!-- Header -->
  <header class="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-sm border-b border-slate-800/50">
    <nav class="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
      <a href="/" class="font-mono font-medium text-lg tracking-tight">
        <span class="text-indigo-400">dup</span><span class="text-slate-400">detector</span>
      </a>
      <div class="flex items-center gap-8 text-sm">
        <a href="#features" class="text-slate-400 hover:text-slate-100 transition-colors">Features</a>
        <a href="#testimonials" class="text-slate-400 hover:text-slate-100 transition-colors">Testimonials</a>
        <span class="text-slate-600">Free</span>
      </div>
    </nav>
  </header>

  <!-- Hero -->
  <section class="pt-32 pb-20 px-6">
    <div class="max-w-3xl mx-auto text-center">
      <h1 class="text-5xl md:text-6xl font-bold tracking-tight mb-6">
        Find Duplicates.<br />
        <span class="text-indigo-400">Fast.</span>
      </h1>
      <p class="text-xl text-slate-400 mb-10 max-w-xl mx-auto">
        A free, simple tool to detect duplicate files and reclaim your drive space. No complex menus. No subscriptions. Just results.
      </p>

      <div class="flex flex-col items-center gap-4">
        {#if isLoading}
          <button
            disabled
            class="px-8 py-4 bg-slate-800 text-slate-400 rounded-lg font-medium cursor-wait"
          >
            Checking for latest version...
          </button>
        {:else if downloadUrl}
          <button
            onclick={handleDownload}
            class="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors flex items-center gap-3"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download for {osNames[userOS]}
          </button>
          <span class="text-sm text-slate-500">
            {latestVersion} &middot; {downloadFileName}
          </span>
        {:else}
          <a
            href={`https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`}
            target="_blank"
            rel="noopener"
            class="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
          >
            View Downloads
          </a>
        {/if}

        {#if allAssets.length > 1}
          <details class="text-sm text-slate-400 mt-2">
            <summary class="cursor-pointer hover:text-slate-300 transition-colors">
              Other platforms
            </summary>
            <div class="mt-3 flex flex-wrap justify-center gap-2">
              {#each allAssets as asset}
                <button
                  onclick={() => selectDownload(asset)}
                  class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-xs transition-colors"
                >
                  {asset.name}
                  <span class="text-slate-500 ml-1">({formatSize(asset.size)})</span>
                </button>
              {/each}
            </div>
          </details>
        {/if}
      </div>

      <p class="mt-8 text-sm text-slate-500">
        Works on macOS, Windows & Linux. Always free.
      </p>
    </div>
  </section>

  <!-- Speed Highlight -->
  <section class="py-16 px-6 border-y border-slate-800/50">
    <div class="max-w-4xl mx-auto">
      <div class="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
        <div class="text-center">
          <div class="font-mono text-5xl md:text-6xl font-bold text-indigo-400 mb-2">10,000+</div>
          <div class="text-slate-400 text-sm">files scanned per second</div>
        </div>
        <div class="hidden md:block w-px h-16 bg-slate-800"></div>
        <div class="text-center max-w-xs">
          <p class="text-slate-300 text-sm leading-relaxed">
            Written in <span class="text-indigo-400 font-medium">Rust</span> for native performance.
            Smart hashing compares file sizes first, then partial content, only fully hashing when necessary.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- Features -->
  <section id="features" class="py-20 px-6 bg-slate-900/50">
    <div class="max-w-5xl mx-auto">
      <h2 class="text-3xl font-bold text-center mb-12">Simple by design</h2>
      <div class="grid md:grid-cols-2 gap-8">
        {#each features as feature}
          <div class="p-6 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div class="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center mb-4">
              {#if feature.icon === 'zap'}
                <svg class="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              {:else if feature.icon === 'hard-drive'}
                <svg class="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
              {:else if feature.icon === 'shield'}
                <svg class="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              {:else if feature.icon === 'layers'}
                <svg class="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              {/if}
            </div>
            <h3 class="text-lg font-semibold mb-2">{feature.title}</h3>
            <p class="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Metrics -->
  <section class="py-20 px-6">
    <div class="max-w-5xl mx-auto">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        <div>
          <div class="text-4xl font-bold text-indigo-400 mb-2">&lt;1s</div>
          <div class="text-sm text-slate-400">Typical scan time</div>
        </div>
        <div>
          <div class="text-4xl font-bold text-indigo-400 mb-2">100%</div>
          <div class="text-sm text-slate-400">Free forever</div>
        </div>
        <div>
          <div class="text-4xl font-bold text-indigo-400 mb-2">3</div>
          <div class="text-sm text-slate-400">Platforms supported</div>
        </div>
        <div>
          <div class="text-4xl font-bold text-indigo-400 mb-2">0</div>
          <div class="text-sm text-slate-400">Files auto-deleted</div>
        </div>
      </div>
    </div>
  </section>

  <!-- Testimonials -->
  <section id="testimonials" class="py-20 px-6 bg-slate-900/50">
    <div class="max-w-4xl mx-auto">
      <h2 class="text-3xl font-bold text-center mb-12">What people say</h2>
      <div class="grid md:grid-cols-3 gap-6">
        {#each testimonials as testimonial}
          <div class="p-6 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <p class="text-slate-300 text-sm leading-relaxed mb-4">"{testimonial.quote}"</p>
            <p class="text-slate-500 text-xs">— {testimonial.author}</p>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Email Signup -->
  <section class="py-20 px-6">
    <div class="max-w-md mx-auto text-center">
      <h2 class="text-2xl font-bold mb-4">Stay updated</h2>
      <p class="text-slate-400 text-sm mb-6">
        Get notified about new features and releases. No spam, ever.
      </p>

      {#if emailSubmitted}
        <div class="p-4 bg-green-900/30 border border-green-700/50 rounded-lg text-green-400 text-sm">
          Thanks! We'll keep you posted.
        </div>
      {:else}
        <form onsubmit={handleEmailSubmit} class="flex gap-2">
          <input
            type="email"
            bind:value={email}
            placeholder="you@example.com"
            class="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            type="submit"
            class="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-sm transition-colors whitespace-nowrap"
          >
            Notify me
          </button>
        </form>
        {#if emailError}
          <p class="mt-2 text-red-400 text-sm">{emailError}</p>
        {/if}
      {/if}
    </div>
  </section>

  <!-- CTA -->
  <section class="py-20 px-6 border-t border-slate-800">
    <div class="max-w-2xl mx-auto text-center">
      <h2 class="text-3xl font-bold mb-4">Ready to reclaim your space?</h2>
      <p class="text-slate-400 mb-8">Download Dup Detector and find those duplicates in seconds.</p>

      {#if downloadUrl}
        <button
          onclick={handleDownload}
          class="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-3"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Now
        </button>
      {:else}
        <a
          href={`https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`}
          target="_blank"
          rel="noopener"
          class="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors inline-block"
        >
          Download Now
        </a>
      {/if}
    </div>
  </section>

  <!-- Footer -->
  <footer class="py-12 px-6 border-t border-slate-800">
    <div class="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
      <div class="font-mono text-sm text-slate-500">
        <span class="text-indigo-400">dup</span><span class="text-slate-600">detector</span>
        <span class="ml-2">&middot; Free & Open Source</span>
      </div>
      <div class="flex items-center gap-6 text-sm text-slate-500">
        <a
          href={`https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`}
          target="_blank"
          rel="noopener"
          class="hover:text-slate-300 transition-colors"
        >
          GitHub
        </a>
        <span class="text-slate-700">Don't Follow</span>
      </div>
    </div>
  </footer>
</div>
