function addImportantToStylesheet(path) {
  document.addEventListener("DOMContentLoaded", function() {
    const styleSheets = document.styleSheets;

    for (let i = 0; i < styleSheets.length; i++) {
      const sheet = styleSheets[i];
      if (sheet.href && sheet.href.endsWith(path)) {
        try {
          const rules = sheet.cssRules || sheet.rules;

          for (let j = 0; j < rules.length; j++) {
            const rule = rules[j];
            if (rule.style) {
              for (let k = 0; k < rule.style.length; k++) {
                const property = rule.style[k];
                rule.style.setProperty(property, rule.style.getPropertyValue(property), "important");
              }
            }
          }
        } catch (e) {
          console.warn('スタイルシートにアクセスできません:', sheet.href, e);
        }
      }
    }
  });
}
