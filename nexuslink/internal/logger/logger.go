package logger

import (
	"encoding/json"
	"log"
	"os"
	"time"
)

// LogLevel represents the severity of a log message
type LogLevel string

const (
	DEBUG LogLevel = "DEBUG"
	INFO  LogLevel = "INFO"
	WARN  LogLevel = "WARN"
	ERROR LogLevel = "ERROR"
	FATAL LogLevel = "FATAL"
)

// Logger provides structured logging
type Logger struct {
	serviceName string
	jsonOutput  bool
}

// LogEntry represents a structured log entry
type LogEntry struct {
	Timestamp string                 `json:"timestamp"`
	Level     string                 `json:"level"`
	Service   string                 `json:"service"`
	Message   string                 `json:"message"`
	Fields    map[string]interface{} `json:"fields,omitempty"`
	Error     string                 `json:"error,omitempty"`
}

var defaultLogger *Logger

// Init initializes the global logger
func Init(serviceName string, jsonOutput bool) {
	defaultLogger = &Logger{
		serviceName: serviceName,
		jsonOutput:  jsonOutput,
	}
}

// GetLogger returns the default logger instance
func GetLogger() *Logger {
	if defaultLogger == nil {
		Init("nexuslink", true)
	}
	return defaultLogger
}

// log writes a log entry
func (l *Logger) log(level LogLevel, message string, fields map[string]interface{}, err error) {
	entry := LogEntry{
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Level:     string(level),
		Service:   l.serviceName,
		Message:   message,
		Fields:    fields,
	}

	if err != nil {
		entry.Error = err.Error()
	}

	if l.jsonOutput {
		jsonData, _ := json.Marshal(entry)
		log.Println(string(jsonData))
	} else {
		// Plain text format for development
		output := "[" + entry.Timestamp + "] " + entry.Level + " " + entry.Message
		if err != nil {
			output += " error=" + err.Error()
		}
		if len(fields) > 0 {
			fieldsJSON, _ := json.Marshal(fields)
			output += " fields=" + string(fieldsJSON)
		}
		log.Println(output)
	}

	// Fatal level exits the program
	if level == FATAL {
		os.Exit(1)
	}
}

// Debug logs a debug message
func (l *Logger) Debug(message string, fields map[string]interface{}) {
	l.log(DEBUG, message, fields, nil)
}

// Info logs an info message
func (l *Logger) Info(message string, fields map[string]interface{}) {
	l.log(INFO, message, fields, nil)
}

// Warn logs a warning message
func (l *Logger) Warn(message string, fields map[string]interface{}) {
	l.log(WARN, message, fields, nil)
}

// Error logs an error message
func (l *Logger) Error(message string, err error, fields map[string]interface{}) {
	l.log(ERROR, message, fields, err)
}

// Fatal logs a fatal message and exits
func (l *Logger) Fatal(message string, err error, fields map[string]interface{}) {
	l.log(FATAL, message, fields, err)
}

// Package-level convenience functions

// Debug logs a debug message using the default logger
func Debug(message string, fields map[string]interface{}) {
	GetLogger().Debug(message, fields)
}

// Info logs an info message using the default logger
func Info(message string, fields map[string]interface{}) {
	GetLogger().Info(message, fields)
}

// Warn logs a warning message using the default logger
func Warn(message string, fields map[string]interface{}) {
	GetLogger().Warn(message, fields)
}

// Error logs an error message using the default logger
func Error(message string, err error, fields map[string]interface{}) {
	GetLogger().Error(message, err, fields)
}

// Fatal logs a fatal message and exits using the default logger
func Fatal(message string, err error, fields map[string]interface{}) {
	GetLogger().Fatal(message, err, fields)
}

// HTTPRequestFields returns common fields for HTTP request logging
func HTTPRequestFields(method, path, remoteAddr string, statusCode int, duration time.Duration) map[string]interface{} {
	return map[string]interface{}{
		"method":      method,
		"path":        path,
		"remote_addr": remoteAddr,
		"status_code": statusCode,
		"duration_ms": duration.Milliseconds(),
	}
}

// LinkOperationFields returns common fields for link operation logging
func LinkOperationFields(alias, operation, nodeID string) map[string]interface{} {
	return map[string]interface{}{
		"alias":     alias,
		"operation": operation,
		"node_id":   nodeID,
	}
}

// DatabaseOperationFields returns common fields for database operation logging
func DatabaseOperationFields(table, operation string, itemCount int) map[string]interface{} {
	return map[string]interface{}{
		"table":      table,
		"operation":  operation,
		"item_count": itemCount,
	}
}
