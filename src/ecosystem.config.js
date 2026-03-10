module.exports = {
  apps: [
    {
      name: "ecommerce-api",
      script: "./server.js",
      instances: 3,
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 8386,
      },
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      ignore_watch: ["node_modules", "logs"],
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
  deploy: {
    production: {
      user: "ec2-user",
      host: "your-ec2-ip",
      key: "~/.ssh/your-key.pem",
      ref: "origin/main",
      repo: "your-git-repo-url",
      path: "/home/ec2-user/ecommerce",
      "post-deploy":
        "npm install && pm2 reload ecosystem.config.js --env production",
    },
  },
};
