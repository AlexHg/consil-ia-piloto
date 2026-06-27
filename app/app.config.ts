export default defineAppConfig({
  ui: {
    colors: {
      primary: 'brand',
      secondary: 'sky',
      success: 'emerald',
      info: 'blue',
      warning: 'amber',
      error: 'rose',
      neutral: 'slate'
    },
    dashboardPanel: {
      slots: {
        body: 'bg-muted'
      }
    }
  }
})
