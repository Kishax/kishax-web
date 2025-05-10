const processEnvSpecificConfig = (target: any, currentEnv: string, base: any, path: string[] = []) => {
  for (const key in target) {
    if (target.hasOwnProperty(key)) {
      const newPath = [...path, key];
      const targetValue = target[key];

      if (targetValue && typeof targetValue === 'object' && targetValue[currentEnv] !== undefined) {
        base[key] = targetValue[currentEnv];
      } else if (targetValue !== undefined && !(targetValue && typeof targetValue === 'object')) {
        base[key] = targetValue;
      } else if (targetValue && typeof targetValue === 'object') {
        if (targetValue[currentEnv] !== undefined) {
          base[key] = targetValue[currentEnv];
        } else {
          if (!base[key] || typeof base[key] !== 'object') {
            base[key] = {};
          }
          processEnvSpecificConfig(targetValue, currentEnv, base[key], newPath);
        }
      }
    }
  }
};

export {
  processEnvSpecificConfig
};
