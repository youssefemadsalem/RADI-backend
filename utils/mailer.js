const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SYSTEM_EMAIL_USER,
    pass: process.env.SYSTEM_EMAIL_PASSWORD
  }
});

const sendOrderEmailNotifications = async (order, imageAttachmentPath = null) => {
  try {
    const { orderCode, customerDetails, items, subtotal, shippingCost, total, paymentMethod } = order;

    // 1. Generate the HTML table rows for the items (including product thumbnail images)
    const itemsHtml = items.map(item => {
      // Use the Base64 image string directly if available, or fall back to an empty spacer
      const productImgSrc = item.image || ''; 
      
      return `
        <tr>
          <td style="padding: 12px 8px; border-bottom: 1px solid #eee; text-align: center; width: 60px;">
            ${productImgSrc ? `<img src="${productImgSrc}" alt="${item.name}" style="width: 50px; height: auto; border: 1px solid #eee; display: block; margin: 0 auto;" />` : '[No Image]'}
          </td>
          <td style="padding: 12px 8px; border-bottom: 1px solid #eee; font-size: 12px; color: #171717;">
            <strong>${item.name}</strong><br />
            <span style="color: #666; font-size: 11px; text-transform: uppercase;">Color: ${item.selectedColor} / Size: ${item.selectedSize}</span>
          </td>
          <td style="padding: 12px 8px; border-bottom: 1px solid #eee; font-size: 12px; color: #171717;" align="center">x${item.quantity}</td>
          <td style="padding: 12px 8px; border-bottom: 1px solid #eee; font-size: 12px; font-family: monospace; color: #171717;" align="right">E£${item.price}.00</td>
        </tr>
      `;
    }).join('');

    // 2. Core Template applied to both client and admin emails
    const coreTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #171717; background-color: #ffffff; padding: 20px; border: 1px solid #eee;">
        <h2 style="font-family: serif; border-bottom: 2px solid #000; padding-bottom: 15px; text-align: center; letter-spacing: 4px; margin-top: 0;">RADI ARCHIVE</h2>
        
        <p style="font-size: 13px; margin: 20px 0 5px 0;"><strong>Order Code Reference:</strong> ${orderCode}</p>
        <p style="font-size: 13px; margin: 0 0 20px 0;"><strong>Payment Choice:</strong> ${paymentMethod}</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background: #fafafa; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #ddd;">
              <th style="padding: 8px;">Image</th>
              <th style="padding: 8px; text-align: left;">Item Details</th>
              <th style="padding: 8px;">Qty</th>
              <th style="padding: 8px; text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        
        <div style="width: 100%; max-width: 250px; margin-left: auto; font-size: 12px; line-height: 1.8; border-top: 1px solid #eee; padding-top: 10px;">
          <div style="display: flex; justify-content: space-between; color: #666;">
            <span>Subtotal:</span>
            <span style="font-family: monospace;">E£${subtotal}.00</span>
          </div>
          <div style="display: flex; justify-content: space-between; color: #666;">
            <span>Shipping:</span>
            <span style="font-family: monospace;">E£${shippingCost}.00</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; color: #000; border-top: 1px dashed #ddd; margin-top: 5px; padding-top: 5px;">
            <span>TOTAL:</span>
            <span style="font-family: monospace;">E£${total}.00</span>
          </div>
        </div>
      </div>
    `;

    // 3. Build Mariam's Administration Specific Details Panel (Address & Contact Number)
    const adminDetailsPanel = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto 15px auto; padding: 20px; background-color: #f9f9f9; border: 1px solid #e5e5e5; color: #171717;">
        <h3 style="margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #000; border-bottom: 1px solid #ddd; padding-bottom: 8px;">
          Fulfillment & Delivery Coordinates
        </h3>
        <table style="width: 100%; font-size: 13px; line-height: 1.6;">
          <tr>
            <td style="width: 120px; font-weight: bold; color: #666;">Customer Name:</td>
            <td>${customerDetails.firstName} ${customerDetails.lastName}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; color: #666;">Phone Number:</td>
            <td><a href="tel:${customerDetails.phone}" style="color: #000; font-weight: bold; text-decoration: none;">${customerDetails.phone}</a></td>
          </tr>
          <tr>
            <td style="font-weight: bold; color: #666;">Email Address:</td>
            <td>${customerDetails.email}</td>
          </tr>
          <tr style="vertical-align: top;">
            <td style="font-weight: bold; color: #666; padding-top: 5px;">Shipping Address:</td>
            <td style="padding-top: 5px; background: #fff; padding: 8px; border: 1px solid #eee; border-radius: 4px;">
              ${customerDetails.shippingAddress.address}<br />
              ${customerDetails.shippingAddress.apartment ? `Apartment/Suite: ${customerDetails.shippingAddress.apartment}<br />` : ''}
              City: ${customerDetails.shippingAddress.city}<br />
              Governorate: <strong>${customerDetails.shippingAddress.governorate}</strong>
              ${customerDetails.shippingAddress.postalCode ? `<br />Postal Code: ${customerDetails.shippingAddress.postalCode}` : ''}
            </td>
          </tr>
        </table>
      </div>
    `;

    // 📩 DESPATCH EMAIL 1: Target Client Inbox
    await transporter.sendMail({
      from: `"RADI Archive Store" <${process.env.SYSTEM_EMAIL_USER}>`,
      to: customerDetails.email,
      subject: `Order Logged Successfully - ${orderCode}`,
      html: `
        <div style="background-color: #fafafa; padding: 20px;">
          <p style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto 15px auto; font-size: 14px;">
            Hello ${customerDetails.firstName},<br /><br />
            Your order has been placed successfully. Delivery cycles require approximately 2-3 weeks to clear local hubs.
          </p> 
          ${coreTemplate}
        </div>
      `
    });

    // 📩 DESPATCH EMAIL 2: Target Administration Pipeline (Mariam)
    await transporter.sendMail({
      from: `"Fulfillment Dispatch System" <${process.env.SYSTEM_EMAIL_USER}>`,
      to: 'Mariammrradi@gmail.com',
      subject: `⚠️ ACTION REQUIRED: New Order Invoice [${orderCode}]`,
      html: `
        <div style="background-color: #f4f4f4; padding: 20px;">
          <p style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto 15px auto; font-size: 14px; color: #dc2626; font-weight: bold;">
            A new checkout order has cleared validation. Please review customer details and inventory metrics below.
          </p> 
          ${adminDetailsPanel}
          ${coreTemplate}
        </div>
      `,
      // Attach the receipt screenshot if paymentMethod is INSTAPAY
      attachments: imageAttachmentPath ? [{ filename: `receipt_${orderCode}.png`, path: imageAttachmentPath }] : []
    });

    console.log(`[SMTP Engine] Notifications processed cleanly for order: ${orderCode}`);
  } catch (error) {
    console.error('[SMTP Engine Failure] Could not route mail messages:', error.message);
  }
};

module.exports = { sendOrderEmailNotifications };