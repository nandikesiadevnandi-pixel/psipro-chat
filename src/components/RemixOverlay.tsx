import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MousePointerClick, Copy, ToggleRight, Check, ArrowRight } from 'lucide-react';

const RemixOverlay: React.FC = () => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm"
      >
        {/* Card 1 - topo esquerdo, próximo do botão do menu */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="absolute top-3 left-8 max-w-xs"
        >
          <div className="relative bg-card border border-border rounded-2xl shadow-2xl p-5">
            <div className="absolute -top-2 left-6 w-4 h-4 bg-card border-l border-t border-border rotate-45" />
            
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0">
                1
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <MousePointerClick className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm text-foreground">Abra o menu</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Clique no nome do projeto no canto superior esquerdo para abrir as opções
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Row com Card 2, Seta e Card 3 */}
        <div className="absolute top-[7.5rem] left-8 flex flex-row items-center justify-between" style={{ width: '65%' }}>
          {/* Card 2 */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="max-w-xs flex-shrink-0"
          >
            <div className="bg-card border border-border rounded-2xl shadow-2xl p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0">
                  2
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Copy className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-sm text-foreground">Remix this project</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    No menu, clique na opção destacada abaixo
                  </p>
                </div>
              </div>

              <div className="bg-background border border-border rounded-lg overflow-hidden text-xs shadow-lg">
                <div className="px-3 py-2.5 text-muted-foreground">Settings...</div>
                <div className="px-3 py-2.5 text-muted-foreground">Publish</div>
                <div className="px-3 py-2.5 bg-primary/10 border-l-2 border-primary text-primary font-semibold flex items-center gap-2">
                  <Copy className="w-3 h-3" />
                  Remix this project
                </div>
                <div className="px-3 py-2.5 text-muted-foreground">Share</div>
                <div className="px-3 py-2.5 text-muted-foreground">Delete project</div>
              </div>
            </div>
          </motion.div>

          {/* Seta */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="flex items-center px-4 flex-shrink-0"
          >
            <div className="relative flex items-center">
              {/* Linha com glow */}
              <div className="w-24 h-1 rounded-full bg-gradient-to-r from-emerald-400 via-primary to-emerald-300 shadow-[0_0_12px_hsl(var(--primary))]" />
              {/* Ponta da seta animada */}
              <motion.div
                animate={{ x: [0, 8, 0] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                className="relative -ml-1"
              >
                <div className="w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-l-[16px] border-l-emerald-400 drop-shadow-[0_0_8px_hsl(var(--primary))]" />
              </motion.div>
            </div>
          </motion.div>

          {/* Card 3 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, type: "spring", stiffness: 300, damping: 24 }}
            className="max-w-md flex-shrink-0"
          >
            <div className="bg-card border border-border rounded-2xl shadow-2xl p-6">
              <div className="flex items-start gap-3 mb-5">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold flex-shrink-0">
                  3
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <ToggleRight className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-base text-foreground">Ative e confirme</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Ative o toggle abaixo e clique em OK para criar sua cópia
                  </p>
                </div>
              </div>

              <div className="bg-background border border-border rounded-lg overflow-hidden text-sm shadow-lg">
                <div className="px-4 py-3 border-b border-border font-semibold text-foreground">Remix project</div>
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-muted-foreground">Include Custom Knowledge</span>
                  <div className="w-10 h-6 bg-primary rounded-full flex items-center justify-end px-0.5">
                    <div className="w-5 h-5 bg-white rounded-full shadow" />
                  </div>
                </div>
                <div className="px-4 py-3 flex justify-end">
                  <div className="px-5 py-2 bg-primary text-primary-foreground rounded-md font-semibold text-sm flex items-center gap-1.5">
                    <Check className="w-4 h-4" />
                    OK
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

      </motion.div>
    </AnimatePresence>
  );
};

export default RemixOverlay;
