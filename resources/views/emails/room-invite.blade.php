<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; background: #f4f4f4; padding: 40px; }
        .card { background: #fff; max-width: 520px; margin: auto; padding: 32px; border-radius: 8px; }
        h2 { color: #1a1a2e; }
        p { color: #444; line-height: 1.6; }
        .btn {
            display: inline-block; margin-top: 24px; padding: 12px 28px;
            background: #4f46e5; color: #fff; text-decoration: none;
            border-radius: 6px; font-weight: bold;
        }
        .note { margin-top: 20px; font-size: 13px; color: #999; }
    </style>
</head>
<body>
    <div class="card">
        <h2>You're invited to SecureChat</h2>
        <p><strong>{{ $inviterName }}</strong> has invited you to join the room <strong>{{ $roomName }}</strong>.</p>
        <p>This is an end-to-end encrypted room. Your messages are never readable by the server.</p>
        <a href="{{ $inviteUrl }}" class="btn">Accept Invite</a>
        <p class="note">This invite expires in 24 hours. If you didn't expect this, ignore this email.</p>
    </div>
</body>
</html>
