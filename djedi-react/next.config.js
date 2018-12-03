const path = require("path");

// No Next.js config is required to use djedi-react, but the example app needs
// to resolve `import "djedi-react"` to local directories in the repo.
module.exports = {
  webpack: config => ({
    ...config,
    resolve: {
      ...config.resolve,
      alias: {
        ...config.resolve.alias,
        "djedi-react": path.resolve(
          __dirname,
          process.env.DJEDI_REACT_DIR || ""
        ),
      },
    },
  }),
};
