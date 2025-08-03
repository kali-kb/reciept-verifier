const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: []
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.File({ filename: 'logs/error.log', level: 'error' }));
  logger.add(new winston.transports.File({ filename: 'logs/combined.log' }));
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
} else {
  logger.add(new winston.transports.Console({
    format: winston.format.json()
  }));
}

module.exports = logger;