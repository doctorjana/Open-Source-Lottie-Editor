import { Folder, FileJson, Image as ImageIcon, Box } from 'lucide-react';

export function ProjectPanel() {
    return (
        <div className="h-full w-full bg-[#0a0a0a] border-r border-border/10 flex flex-col text-xs overflow-hidden">
            <div className="flex border-b border-border/10 shrink-0">
                <div className="flex-1 h-10 flex items-center justify-center gap-2 bg-[#151515] text-blue-400 font-bold border-b-2 border-blue-500">
                    <Box className="w-3.5 h-3.5" />
                    Project
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                <div className="h-full overflow-y-auto p-2">
                    {/* Mock Project Structure */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50 rounded cursor-pointer text-foreground/80 hover:text-foreground">
                            <Folder className="w-3.5 h-3.5 text-blue-400" />
                            <span>Compositions</span>
                        </div>
                        <div className="pl-4 space-y-1">
                            <div className="flex items-center gap-2 px-2 py-1.5 bg-accent/50 text-accent-foreground rounded cursor-pointer">
                                <FileJson className="w-3.5 h-3.5 text-yellow-500" />
                                <span>Main Comp</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50 rounded cursor-pointer text-foreground/80 hover:text-foreground mt-2">
                            <Folder className="w-3.5 h-3.5 text-blue-400" />
                            <span>Assets</span>
                        </div>
                        <div className="pl-4 space-y-1">
                            <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50 rounded cursor-pointer text-muted-foreground">
                                <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                                <span>logo.png</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
