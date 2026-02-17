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
            display: inline-block;
            margin-top: 24px;
            padding: 12px 28px;
            background: #4dbe7a;
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
        }
        .notice {
            background: #f0f0ff;
            border-left: 4px solid #4f46e5;
            padding: 12px 16px;
            border-radius: 4px;
            margin-top: 16px;
            font-size: 14px;
            color: #333;
        }
        .steps { margin: 12px 0 0 16px; padding: 0; color: #555; font-size: 14px; }
        .steps li { margin-bottom: 6px; }
        .note { margin-top: 20px; font-size: 13px; color: #999; }
    </style>
</head>
<body>
    <div class="card">
        <h2>You're invited to SecureChat</h2>
        <p><strong>{{ $inviterName }}</strong> has invited you to join the room <strong>{{ $roomName }}</strong>.</p>
        <p>This is an end-to-end encrypted room. Your messages are never readable by the server.</p>

        <div class="notice">
            <strong>👋 New to SecureChat?</strong><br>
            No worries! Just click the button below. If you don't have an account yet, simply register first — it's free and takes less than a minute. Your invite will be accepted automatically after login.
            <ol class="steps">
                <li>Click "Accept Invite"</li>
                <li>Register or log in</li>
                <li>You'll be added to <strong>#{{ $roomName }}</strong> automatically</li>
            </ol>
        </div>

        <a href="{{ $inviteUrl }}" class="btn">Accept Invite</a>
        <p class="note">This invite expires in 24 hours. If you didn't expect this, ignore this email.</p>
    </div>
</body>
</html>
