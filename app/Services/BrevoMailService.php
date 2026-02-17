<?php

namespace App\Services;

use Brevo\Client\Configuration;
use Brevo\Client\Api\TransactionalEmailsApi;
use Brevo\Client\Model\SendSmtpEmail;
use Brevo\Client\Model\SendSmtpEmailSender;
use Brevo\Client\Model\SendSmtpEmailTo;
use GuzzleHttp\Client;

class BrevoMailService
{
    private TransactionalEmailsApi $api;

    public function __construct()
    {
        $config = Configuration::getDefaultConfiguration()
            ->setApiKey('api-key', config('services.brevo.key'));

        $this->api = new TransactionalEmailsApi(new Client(), $config);
    }

    public function send(string $toEmail, string $toName, string $subject, string $htmlContent): void
    {
        $email = new SendSmtpEmail();

        $email->setSender(new SendSmtpEmailSender([
            'name'  => config('mail.from.name'),
            'email' => config('mail.from.address'),
        ]));

        $email->setTo([
            new SendSmtpEmailTo([
                'email' => $toEmail,
                'name'  => $toName,
            ])
        ]);

        $email->setSubject($subject);
        $email->setHtmlContent($htmlContent);

        $this->api->sendTransacEmail($email);
    }
}
