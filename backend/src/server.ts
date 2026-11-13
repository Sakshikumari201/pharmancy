import app from './app';
import { config } from './config';
import prisma from './lib/prisma';

const server = app.listen(config.port, () => {
  console.log(`====================================================`);
  console.log(` Pharmacy Management Server Running`);
  console.log(` Port: ${config.port}`);
  console.log(` API Endpoint: http://localhost:${config.port}/api`);
  console.log(` Swagger Docs: http://localhost:${config.port}/api/docs`);
  console.log(` Environment: ${config.nodeEnv}`);
  console.log(`====================================================`);
});

const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log('Database disconnected. Process terminated.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
