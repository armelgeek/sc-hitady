type EmailParams = {
  to: string
  subject: string
  text: string
}
const FROM_NAME = 'SC'
const FROM_EMAIL = 'contact@sc.com'
export const sendEmail = async ({ to, subject, text }: EmailParams): Promise<any> => {
  const from = `${FROM_NAME} <${FROM_EMAIL}>`

  const emailData = {
    from,
    to,
    subject,
    text
  }
  await new Promise((resolve) => setTimeout(resolve, 1000))
  console.log('send this mail', emailData)
}
