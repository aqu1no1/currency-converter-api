import { ConsoleLogger, type LogLevel } from '@nestjs/common';
import { loggerConfig } from '@/config';

// Ordem do mais verboso para o mais severo
const LOG_LEVELS: LogLevel[] = ['verbose', 'debug', 'log', 'warn', 'error', 'fatal'];

// LOG_LEVEL=warn habilita warn, error e fatal (nível mínimo)
// LOG_LEVEL=debug,log,warn,error habilita exatamente os níveis listados
function resolveLogLevels(value: string): LogLevel[] {
  const levels = value.split(',').map((level) => level.trim()) as LogLevel[];

  if (levels.length > 1) return LOG_LEVELS.filter((level) => levels.includes(level));

  const index = LOG_LEVELS.indexOf(levels[0]);
  return index === -1 ? LOG_LEVELS.slice(2) : LOG_LEVELS.slice(index);
}

// Criado antes do Nest subir, por isso chama a factory do namespace direto
export function createLogger(): ConsoleLogger {
  const logger = loggerConfig();

  return new ConsoleLogger({
    prefix: 'CurrencyConverter',
    logLevels: resolveLogLevels(logger.level),
    json: logger.json,
  });
}
