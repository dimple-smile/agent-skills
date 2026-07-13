declare module 'localtunnel' {
  interface Tunnel {
    url: string;
    on(event: 'close', listener: () => void): void;
    close(): Promise<void>;
  }
  interface Options {
    port: number;
    subdomain?: string;
    host?: string;
    local_host?: string;
  }
  function localtunnel(options: Options): Promise<Tunnel>;
  export default localtunnel;
}
