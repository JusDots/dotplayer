import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  return {
    // For GitHub Pages, we often need a base path like /repo-name/
    // This can be passed via command line --base or here
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        '/yt-main': {
          target: 'https://www.youtube.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/yt-main/, ''),
          headers: {
            'Origin': 'https://www.youtube.com',
            'Referer': 'https://www.youtube.com/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          },
        },
        '/yt-music': {
          target: 'https://music.youtube.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/yt-music/, ''),
          headers: {
            'Origin': 'https://music.youtube.com',
            'Referer': 'https://music.youtube.com/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          },
        },
        '/yt-api': {
          target: 'https://youtubei.googleapis.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/yt-api/, ''),
          headers: {
            'Origin': 'https://www.youtube.com',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          },
        },

        '/yt-suggest': {
          target: 'https://suggestqueries-clients6.google.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/yt-suggest/, ''),
          headers: {
            'Origin': 'https://www.youtube.com',
          },
        },
        '/yt-oauth': {
          target: 'https://oauth2.googleapis.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/yt-oauth/, ''),
          headers: {
             'Origin': 'https://www.youtube.com',
          }
        },
        '/yt-img-s': {
          target: 'https://s.ytimg.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/yt-img-s/, ''),
          headers: {
             'Origin': 'https://www.youtube.com',
          }
        },
      },
    },
  }
})
