const licenseService = require('@/services/licenseService');
const { sendEmail } = require('@/services/emailService');

const status = async (req, res) => {
  const lockInfo = await licenseService.isLocked();
  return res.status(200).json({
    success: true,
    result: {
      ...lockInfo,
      lockDays: licenseService.getLockDays(),
      licensorEmail: licenseService.LICENSOR_EMAIL,
    },
    message: lockInfo.locked ? 'System is locked.' : 'System is active.',
  });
};

const requestOtp = async (req, res) => {
  try {
    const { otp, licensorEmail } = await licenseService.createOtpRequest();
    await sendEmail({
      to: licensorEmail,
      subject: 'Saltum billing – license unlock OTP',
      html: `
        <p>A customer installation is requesting a license unlock.</p>
        <p><strong>OTP:</strong> ${otp}</p>
        <p>This code expires in 15 minutes. Share it with the customer only after payment is confirmed.</p>
        <p>Lock days this month: ${licenseService.getLockDays().join(', ')}</p>
      `,
    });
    return res.status(200).json({
      success: true,
      result: { sentTo: licensorEmail },
      message: `OTP sent to ${licensorEmail}. Contact Saltum support if you did not receive it.`,
    });
  } catch (error) {
    const statusCode = error.code === 'EMAIL_NOT_CONFIGURED' ? 503 : 400;
    return res.status(statusCode).json({ success: false, result: null, message: error.message });
  }
};

const unlockOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) {
      return res.status(400).json({ success: false, result: null, message: 'OTP is required.' });
    }
    const bypassUntil = await licenseService.verifyOtp(otp);
    return res.status(200).json({
      success: true,
      result: { bypassUntil },
      message: 'System unlocked until end of this month.',
    });
  } catch (error) {
    const statusCode =
      error.code === 'INVALID_OTP' || error.code === 'OTP_EXPIRED' || error.code === 'NO_OTP'
        ? 401
        : 400;
    return res.status(statusCode).json({ success: false, result: null, message: error.message });
  }
};

module.exports = { status, requestOtp, unlockOtp };
