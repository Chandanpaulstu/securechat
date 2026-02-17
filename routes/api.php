<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\RoomController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\InviteController;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Broadcast;

Broadcast::routes(['middleware' => ['auth:sanctum']]);

// Public
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

// Protected
Route::middleware(['auth:sanctum', 'throttle:60,1'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Rooms
    Route::get('/rooms', [RoomController::class, 'index']);
    Route::post('/rooms', [RoomController::class, 'store']);
    Route::get('/rooms/{room}', [RoomController::class, 'show']);
    Route::delete('/rooms/{room}', [RoomController::class, 'destroy']);

    // Room members & keys
    Route::post('/rooms/{room}/join', [RoomController::class, 'join']);
    Route::post('/rooms/{room}/public-key', [RoomController::class, 'storePublicKey']);
    Route::get('/rooms/{room}/members', [RoomController::class, 'members']);

    // Messages
    Route::get('/rooms/{room}/messages', [MessageController::class, 'index']);
    Route::post('/rooms/{room}/messages', [MessageController::class, 'store']);

    // Invites
    Route::post('/rooms/{room}/invite', [InviteController::class, 'send']);
    Route::post('/invites/{token}/accept', [InviteController::class, 'accept']);
});
