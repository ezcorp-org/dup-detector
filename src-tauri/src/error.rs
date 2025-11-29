//! Error types for the Duplicate File Detector.
//!
//! Uses `thiserror` for ergonomic error handling and provides
//! serializable error messages for the frontend.

use serde::Serialize;
use thiserror::Error;

/// Main error type for scanner operations.
#[derive(Error, Debug)]
pub enum ScannerError {
    /// Generic I/O error during file operations.
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    /// Specified path does not exist.
    #[error("Path not found: {0}")]
    PathNotFound(String),

    /// Permission denied when accessing a file or directory.
    #[error("Permission denied: {0}")]
    PermissionDenied(String),

    /// The scan was cancelled by the user.
    #[error("Scan cancelled")]
    Cancelled,

    /// Invalid or malformed path.
    #[error("Invalid path: {0}")]
    InvalidPath(String),

    /// A scan is already in progress.
    #[error("A scan is already in progress")]
    ScanInProgress,

    /// No scan is currently running.
    #[error("No scan is currently running")]
    NoActiveScan,

    /// Failed to delete a file.
    #[error("Failed to delete file: {0}")]
    DeleteFailed(String),

    /// Failed to move file to trash.
    #[error("Failed to move to trash: {0}")]
    TrashFailed(String),

    /// File disappeared during scanning.
    #[error("File no longer exists: {0}")]
    FileDisappeared(String),
}

impl ScannerError {
    /// Returns true if this error should be treated as non-fatal
    /// (i.e., scanning can continue for other files).
    pub fn is_recoverable(&self) -> bool {
        matches!(
            self,
            ScannerError::PermissionDenied(_)
                | ScannerError::FileDisappeared(_)
                | ScannerError::InvalidPath(_)
        )
    }

    /// Converts this error to a user-friendly message.
    pub fn user_message(&self) -> String {
        match self {
            ScannerError::Io(e) => format!("File operation failed: {}", e),
            ScannerError::PathNotFound(p) => format!("Path not found: {}", p),
            ScannerError::PermissionDenied(p) => format!("Access denied: {}", p),
            ScannerError::Cancelled => "Scan was cancelled".to_string(),
            ScannerError::InvalidPath(p) => format!("Invalid path: {}", p),
            ScannerError::ScanInProgress => "A scan is already running".to_string(),
            ScannerError::NoActiveScan => "No scan is currently running".to_string(),
            ScannerError::DeleteFailed(p) => format!("Could not delete: {}", p),
            ScannerError::TrashFailed(p) => format!("Could not move to trash: {}", p),
            ScannerError::FileDisappeared(p) => format!("File was removed: {}", p),
        }
    }
}

/// Serializable error response for the frontend.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ErrorResponse {
    /// Error code for programmatic handling.
    pub code: String,

    /// Human-readable error message.
    pub message: String,

    /// Optional path related to the error.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
}

impl ErrorResponse {
    /// Creates a new ErrorResponse.
    pub fn new(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
            path: None,
        }
    }

    /// Adds a path to the error response.
    pub fn with_path(mut self, path: impl Into<String>) -> Self {
        self.path = Some(path.into());
        self
    }
}

impl From<ScannerError> for ErrorResponse {
    fn from(err: ScannerError) -> Self {
        let code = match &err {
            ScannerError::Io(_) => "IO_ERROR",
            ScannerError::PathNotFound(_) => "PATH_NOT_FOUND",
            ScannerError::PermissionDenied(_) => "PERMISSION_DENIED",
            ScannerError::Cancelled => "CANCELLED",
            ScannerError::InvalidPath(_) => "INVALID_PATH",
            ScannerError::ScanInProgress => "SCAN_IN_PROGRESS",
            ScannerError::NoActiveScan => "NO_ACTIVE_SCAN",
            ScannerError::DeleteFailed(_) => "DELETE_FAILED",
            ScannerError::TrashFailed(_) => "TRASH_FAILED",
            ScannerError::FileDisappeared(_) => "FILE_DISAPPEARED",
        };

        let path = match &err {
            ScannerError::PathNotFound(p)
            | ScannerError::PermissionDenied(p)
            | ScannerError::InvalidPath(p)
            | ScannerError::DeleteFailed(p)
            | ScannerError::TrashFailed(p)
            | ScannerError::FileDisappeared(p) => Some(p.clone()),
            _ => None,
        };

        let mut response = ErrorResponse::new(code, err.user_message());
        if let Some(p) = path {
            response = response.with_path(p);
        }
        response
    }
}

/// Converts ScannerError to a String for Tauri command returns.
impl From<ScannerError> for String {
    fn from(err: ScannerError) -> Self {
        let response = ErrorResponse::from(err);
        serde_json::to_string(&response).unwrap_or(response.message)
    }
}

/// Result type alias for scanner operations.
pub type ScannerResult<T> = Result<T, ScannerError>;

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Error as IoError, ErrorKind};

    #[test]
    fn test_io_error_conversion() {
        let io_err = IoError::new(ErrorKind::NotFound, "file not found");
        let scanner_err = ScannerError::from(io_err);

        assert!(matches!(scanner_err, ScannerError::Io(_)));
        assert!(scanner_err.to_string().contains("IO error"));
    }

    #[test]
    fn test_path_not_found() {
        let err = ScannerError::PathNotFound("/missing/path".to_string());
        assert_eq!(err.to_string(), "Path not found: /missing/path");
        assert!(!err.is_recoverable());
    }

    #[test]
    fn test_permission_denied_is_recoverable() {
        let err = ScannerError::PermissionDenied("/protected/file".to_string());
        assert!(err.is_recoverable());
    }

    #[test]
    fn test_file_disappeared_is_recoverable() {
        let err = ScannerError::FileDisappeared("/tmp/gone".to_string());
        assert!(err.is_recoverable());
    }

    #[test]
    fn test_cancelled_not_recoverable() {
        let err = ScannerError::Cancelled;
        assert!(!err.is_recoverable());
    }

    #[test]
    fn test_user_message() {
        let err = ScannerError::ScanInProgress;
        assert_eq!(err.user_message(), "A scan is already running");
    }

    #[test]
    fn test_error_response_creation() {
        let response = ErrorResponse::new("TEST_ERROR", "Test message");
        assert_eq!(response.code, "TEST_ERROR");
        assert_eq!(response.message, "Test message");
        assert!(response.path.is_none());
    }

    #[test]
    fn test_error_response_with_path() {
        let response = ErrorResponse::new("ERROR", "Message").with_path("/some/path");

        assert_eq!(response.path, Some("/some/path".to_string()));
    }

    #[test]
    fn test_error_response_serialization() {
        let response = ErrorResponse::new("CODE", "Message").with_path("/path");
        let json = serde_json::to_string(&response).unwrap();

        assert!(json.contains("\"code\":\"CODE\""));
        assert!(json.contains("\"message\":\"Message\""));
        assert!(json.contains("\"path\":\"/path\""));
    }

    #[test]
    fn test_scanner_error_to_error_response() {
        let err = ScannerError::PathNotFound("/test/path".to_string());
        let response: ErrorResponse = err.into();

        assert_eq!(response.code, "PATH_NOT_FOUND");
        assert!(response.message.contains("/test/path"));
        assert_eq!(response.path, Some("/test/path".to_string()));
    }

    #[test]
    fn test_cancelled_error_response() {
        let err = ScannerError::Cancelled;
        let response: ErrorResponse = err.into();

        assert_eq!(response.code, "CANCELLED");
        assert!(response.path.is_none());
    }

    #[test]
    fn test_scanner_error_to_string() {
        let err = ScannerError::ScanInProgress;
        let json_str: String = err.into();

        // Should be valid JSON
        let parsed: serde_json::Value = serde_json::from_str(&json_str).unwrap();
        assert_eq!(parsed["code"], "SCAN_IN_PROGRESS");
    }
}
