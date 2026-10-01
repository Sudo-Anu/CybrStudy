// =============================================================
// Google Apps Script — Drive Proxy
// INSTRUCTIONS: Paste this entire file into Google Apps Script.
// Deploy as: Web App → Execute as: Me → Access: Anyone
// =============================================================

// ---- Configuration ----
// Optional: set a specific parent folder ID to keep uploads organized
var PARENT_FOLDER_ID = ''; // Leave empty to use Drive root

// Optional: Set a secret token for write/delete actions if desired (leave empty to allow verified client requests)
var AUTH_SECRET = '';

// ---- Entry point ----
function doPost(e) {
  var cors = ContentService.createTextOutput();
  cors.setMimeType(ContentService.MimeType.JSON);

  try {
    if (!e || !e.postData || !e.postData.contents) {
      cors.setContent(JSON.stringify({
        error: 'No post data received. Payload may have exceeded server limits or connection was interrupted.'
      }));
      return cors;
    }

    var body   = JSON.parse(e.postData.contents);
    var action = body.action;
    var result = {};

    // Validate AUTH_SECRET if configured
    if (AUTH_SECRET && (action === 'upload' || action === 'delete')) {
      if (body.authSecret !== AUTH_SECRET) {
        cors.setContent(JSON.stringify({ error: 'Unauthorized: Invalid authentication secret.' }));
        return cors;
      }
    }

    if (action === 'upload') {
      result = handleUpload(body);
    } else if (action === 'delete') {
      result = handleDelete(body);
    } else if (action === 'info') {
      result = handleInfo(body);
    } else {
      result = { error: 'Unknown action: ' + action };
    }

    cors.setContent(JSON.stringify(result));
  } catch (err) {
    cors.setContent(JSON.stringify({ error: err.message }));
  }

  return cors;
}

// Needed for CORS preflight
function doGet(e) {
  return ContentService.createTextOutput('CybrStudy Drive Proxy — OK')
    .setMimeType(ContentService.MimeType.TEXT);
}

// ---- Upload handler ----
function handleUpload(body) {
  var name     = body.name;
  var mimeType = body.mimeType;
  var data     = body.data;      // base64 string
  var folderId = body.folderId || PARENT_FOLDER_ID;

  // Decode base64 to bytes
  var bytes = Utilities.base64Decode(data);
  var blob  = Utilities.newBlob(bytes, mimeType, name);

  var folder;
  if (folderId) {
    folder = DriveApp.getFolderById(folderId);
  } else {
    folder = DriveApp.getRootFolder();
  }

  var file = folder.createFile(blob);
  // Make publicly viewable (read-only, no login required)
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  var fileId = file.getId();
  return {
    fileId:      fileId,
    viewUrl:     'https://drive.google.com/file/d/' + fileId + '/view',
    downloadUrl: 'https://drive.google.com/uc?export=download&id=' + fileId,
    name:        name,
  };
}

// ---- Delete handler ----
function handleDelete(body) {
  var fileId = body.fileId;
  if (!fileId) return { error: 'fileId is required' };

  try {
    var file = DriveApp.getFileById(fileId);
    file.setTrashed(true); // Move to trash (recoverable), use file.delete() for permanent
    return { success: true, message: 'File moved to trash: ' + fileId };
  } catch (err) {
    return { error: 'Failed to delete file: ' + err.message };
  }
}

// ---- Info / Metadata handler ----
function handleInfo(body) {
  var fileId = body.fileId;
  if (!fileId) return { error: 'fileId is required' };

  try {
    var file = DriveApp.getFileById(fileId);
    // Ensure file is publicly accessible with link
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (permErr) {
      // Permission might be managed by parent folder or restricted
    }

    return {
      success:     true,
      fileId:      fileId,
      name:        file.getName(),
      mimeType:    file.getMimeType(),
      size:        file.getSize(),
      viewUrl:     'https://drive.google.com/file/d/' + fileId + '/view',
      downloadUrl: 'https://drive.google.com/uc?export=download&id=' + fileId,
    };
  } catch (err) {
    return { error: 'Unable to access file: ' + err.message + '. Please ensure sharing is set to "Anyone with the link can view".' };
  }
}

