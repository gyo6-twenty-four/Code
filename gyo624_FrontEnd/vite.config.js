import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// Standalone UI: this server serves the frontend only and has no API proxy.
export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
})
