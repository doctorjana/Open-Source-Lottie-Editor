import { Folder, FileJson, Image as ImageIcon } from 'lucide-react';

export function ProjectPanel() {
    return (
        <div className="h-full w-full bg-card border-r border-border flex flex-col text-xs">
            <div className="h-8 border-b border-border flex items-center px-4 font-semibold text-muted-foreground shrink-0">
                Project
            </div>

            <div className="flex-1 overflow-y-auto p-2">
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
    );
}
