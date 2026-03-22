import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/transportation-problem-lab/',  // 👈 关键修改（仓库名）
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});