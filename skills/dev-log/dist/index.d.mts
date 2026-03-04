import http from 'http';

interface Addresses {
    local: number | null;
    network: string | null;
    tunnel: string | null;
}
interface LogEntry {
    sessionId: string;
    time: string;
    type: string;
    data: unknown;
}
declare const addresses: Addresses;
declare function getLocalIP(): string | null;
declare function readLogs(sessionId?: string): LogEntry[];
declare function killOldProcess(): void;
declare function selfTest(port: number): Promise<boolean>;
declare function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void;
declare function createServer(): http.Server;
declare function startTunnel(port: number): Promise<string | null>;
declare function printStartupInfo(): void;
declare function startServer(): Promise<void>;

export { addresses, createServer, getLocalIP, handleRequest, killOldProcess, printStartupInfo, readLogs, selfTest, startServer, startTunnel };
export type { Addresses, LogEntry };
