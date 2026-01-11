import { Header } from './components/editor/Header';
import { ProjectPanel } from './components/editor/ProjectPanel';
import { Viewport } from './components/editor/Viewport';
import { Timeline } from './components/editor/Timeline';
import { PropertiesPanel } from './components/editor/PropertiesPanel';
import { Panel, Group, Separator } from 'react-resizable-panels';

function App() {
  return (
    <div className="h-screen w-screen flex flex-col bg-[#050505] text-foreground overflow-hidden selection:bg-blue-500/30">
      <Header />

      <main className="flex-1 flex overflow-hidden">
        <Group id="editor-layout-v2" orientation="vertical" className="h-full w-full">
          <Panel id="v2-top-section" defaultSize={70} minSize={30}>
            <Group id="v2-workspace-layout" orientation="horizontal">
              <Panel id="v2-project-panel" defaultSize={20} minSize={15} className="flex">
                <ProjectPanel />
              </Panel>

              <Separator className="w-[1.5px] bg-border/20 hover:bg-blue-500/50 transition-colors cursor-col-resize" />

              <Panel id="v2-viewport-panel" defaultSize={55} minSize={30} className="flex flex-col">
                <Viewport />
              </Panel>

              <Separator className="w-[1.5px] bg-border/20 hover:bg-blue-500/50 transition-colors cursor-col-resize" />

              <Panel id="v2-properties-panel" defaultSize={25} minSize={20} className="flex">
                <PropertiesPanel />
              </Panel>
            </Group>
          </Panel>

          <Separator className="h-[1.5px] bg-border/20 hover:bg-blue-500/50 transition-colors cursor-row-resize" />

          <Panel id="v2-timeline-panel" defaultSize={30} minSize={25} className="flex border-t border-border/10 bg-[#0d0d0d]">
            <Timeline />
          </Panel>
        </Group>
      </main>
    </div>
  );
}

export default App;
