const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

function isLocalPreviewHost(): boolean {
  return typeof window !== 'undefined' && LOCAL_HOSTS.has(window.location.hostname);
}

async function loadBridge() {
  if (isLocalPreviewHost()) {
    throw new Error('Forge bridge is unavailable in localhost preview mode.');
  }
  return import('@forge/bridge');
}

export async function invoke(name: string, payload?: unknown): Promise<unknown> {
  const bridge = await loadBridge();
  return bridge.invoke(name, payload);
}

export const router = {
  async navigate(target: string): Promise<void> {
    if (isLocalPreviewHost()) return;
    const bridge = await loadBridge();
    await bridge.router.navigate(target);
  },
  async open(target: string): Promise<void> {
    if (isLocalPreviewHost()) return;
    const bridge = await loadBridge();
    await bridge.router.open(target);
  },
};

export const view = {
  async getContext(): Promise<unknown> {
    if (isLocalPreviewHost()) {
      return {};
    }
    const bridge = await loadBridge();
    return bridge.view.getContext();
  },
};

