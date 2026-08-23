import type { AppLocale } from '@/lib/i18n/types';

export type MessageKey =
  | 'profileTitle'
  | 'closeProfile'
  | 'username'
  | 'email'
  | 'school'
  | 'memberSince'
  | 'editUsername'
  | 'saveUsername'
  | 'language'
  | 'themeMode'
  | 'languageHint'
  | 'themeHint'
  | 'updatePassword'
  | 'currentPassword'
  | 'newPassword'
  | 'confirmPassword'
  | 'updatePasswordButton'
  | 'updatingPassword'
  | 'logout'
  | 'fullNameRequired'
  | 'schoolRequiredBeforeUsername'
  | 'loadProfileFailed'
  | 'profileMissing'
  | 'loadProfileUnexpected'
  | 'updateNameFailed'
  | 'updateNameUnexpected'
  | 'passwordAllFields'
  | 'passwordMinLength'
  | 'passwordMismatch'
  | 'passwordChangeFailed'
  | 'passwordChangeUnexpected'
  | 'navBrowser'
  | 'navCart'
  | 'navUploader'
  | 'navCourses'
  | 'navLocker'
  | 'navLogin'
  | 'navRegister'
  | 'navSupport'
  | 'navBrowse'
  | 'navUpload'
  | 'navVerify'
  | 'navAccount'
  | 'navQueue'
  | 'sellerNotesUpload'
  | 'sellerVerifySeller'
  | 'footerTagline1'
  | 'footerTagline2'
  | 'footerCopyright'
  | 'footerPlatform'
  | 'footerPolicies'
  | 'footerHelp'
  | 'footerBrowse'
  | 'footerPrivacy'
  | 'footerTermsOfUse'
  | 'footerMyAccount'
  | 'footerSupport'
  | 'footerContactUs'
  | 'footerTermsOfService'
  | 'footerPrivacyPolicy'
  | 'homeTitleLine1'
  | 'homeTitleLine2'
  | 'homeSubtitle'
  | 'homeNoNotesTitle'
  | 'homeNoNotesBody'
  | 'homeBecomeSeller'
  | 'lockerRoom'
  | 'lockerOverview'
  | 'lockerOrders'
  | 'lockerPurchases'
  | 'lockerSales'
  | 'lockerWallet'
  | 'lockerGradeVerification'
  | 'lockerVerifiedCourses'
  | 'lockerSettings'
  | 'lockerPageTitle'
  | 'lockerPageSubtitle'
  | 'lockerAccountStatus'
  | 'lockerVerifiedSeller'
  | 'lockerBuyerStatus'
  | 'lockerPrimaryAction'
  | 'lockerUploadNotes'
  | 'lockerVerifySeller'
  | 'lockerOrdersDesc'
  | 'lockerPurchasesDesc'
  | 'lockerSalesDesc'
  | 'lockerWalletDesc'
  | 'lockerGradeVerificationDesc'
  | 'lockerVerifiedCoursesDesc'
  | 'lockerSettingsDesc'
  | 'cartEmptyTitle'
  | 'cartEmptyBody'
  | 'cartBrowseNotes'
  | 'cartTitle'
  | 'cartOrderSummary'
  | 'cartRemove'
  | 'cartCheckout'
  | 'cartSubtotal'
  | 'cartTotal'
  | 'cartContinueShopping'
  | 'authWelcomeTitle'
  | 'authSignInSubtitle'
  | 'authEmail'
  | 'authPassword'
  | 'authRememberMe'
  | 'authLogin'
  | 'authLoggingIn'
  | 'authForgotPassword'
  | 'authResetPassword'
  | 'authResendVerification'
  | 'authOr'
  | 'authNewToUstudy'
  | 'authCreateAccount'
  | 'authEnterEmailPassword'
  | 'authVerifyEmailFirst'
  | 'authInvalidCredentials'
  | 'authSessionNotReady'
  | 'authRegisterTitle'
  | 'authRegisterSubtitle'
  | 'authFullName'
  | 'authConfirmPassword'
  | 'authAgreeTerms'
  | 'authCreatingAccount'
  | 'authAlreadyHaveAccount'
  | 'commonLoading'
  | 'commonSave'
  | 'commonCancel'
  | 'commonBack'
  | 'commonContinue'
  | 'commonSubmit'
  | 'commonError'
  | 'commonSuccess'
  | 'metaTitle'
  | 'metaDescription'
  | 'authEmailRequired'
  | 'authEmailDomainOnly'
  | 'authPasswordRequired'
  | 'authPasswordMin8'
  | 'authAgreeTermsRequired'
  | 'authRegistrationFailed'
  | 'authRegisterEmailHint'
  | 'authPasswordMinHint'
  | 'authTermsOfService'
  | 'authPrivacyPolicy'
  | 'authAgreeTermsPrefix'
  | 'authAnd'
  | 'authForgotPasswordTitle'
  | 'authForgotPasswordSubtitle'
  | 'authEnterEmail'
  | 'authResetEmailFailed'
  | 'authResetEmailSuccess'
  | 'authResetLinkExpiry'
  | 'authSendingResetLink'
  | 'authSendResetLink'
  | 'authRememberPassword'
  | 'authBackToLogin'
  | 'authVerifySuccessTitle'
  | 'authVerifySuccessBody'
  | 'authVerifyTitle'
  | 'authVerifySentTo'
  | 'authVerification'
  | 'authInvalidVerificationCode'
  | 'authVerificationFailed'
  | 'authEnterVerificationCode'
  | 'authVerificationCode'
  | 'authPasteCodePlaceholder'
  | 'authLastCodeSentAt'
  | 'authCodeEndsWith'
  | 'authVerifyCodeHint'
  | 'authVerifying'
  | 'authVerifyEmail'
  | 'authEmailForResend'
  | 'authDidntReceiveEmail'
  | 'authSending'
  | 'authResendVerificationEmail'
  | 'authResentCount'
  | 'authEnterEmailForResend'
  | 'authResendMaxExceeded'
  | 'authResendFailed'
  | 'authResendEligible'
  | 'authNewVerificationSent'
  | 'authSetNewPasswordTitle'
  | 'authSetNewPasswordSubtitle'
  | 'authFillBothPasswordFields'
  | 'authPasswordsDoNotMatch'
  | 'authUpdatePasswordFailed'
  | 'authPasswordUpdatedSuccess'
  | 'authValidatingResetLink'
  | 'authResetLinkExpired'
  | 'authRequestNewResetLink'
  | 'authNewPasswordPlaceholder'
  | 'authConfirmPasswordPlaceholder'
  | 'authResetLinkExpiryNote'
  | 'authBackToLoginPrefix'
  | 'learnGrowAchieveTitleLearn'
  | 'learnGrowAchieveTitleGrow'
  | 'learnGrowAchieveTitleAchieve'
  | 'learnGrowAchieveBody'
  | 'learnGrowAchieveView'
  | 'publishNotesTitle'
  | 'publishNotesGroupByCourse'
  | 'publishNotesShowSeparately'
  | 'showMore'
  | 'featuredLatestUploads'
  | 'featuredPrevNotes'
  | 'featuredNextNotes'
  | 'courseSearchPlaceholder'
  | 'courseSearchAriaLabel'
  | 'courseSearchButton'
  | 'courseSearchBrowseHint'
  | 'courseSearchPlaceholderLong'
  | 'noteGrades'
  | 'noteFiles'
  | 'noteLanguage'
  | 'noteViewMaterials'
  | 'noteStudyMaterial'
  | 'noteSeller'
  | 'noteUploaded'
  | 'noteView'
  | 'noteBuy'
  | 'purchasePreparingDownload'
  | 'purchaseViewDownload'
  | 'purchaseDownloadFailed'
  | 'purchasePaymentConfirmed'
  | 'purchaseDownloadAnytime'
  | 'purchaseUnlockedBody'
  | 'purchaseOpenNote'
  | 'coursesFindTitle'
  | 'coursesAllLevels'
  | 'coursesCourseFound'
  | 'coursesCoursesFound'
  | 'coursesPrevPage'
  | 'coursesNextPage'
  | 'coursesPageOf'
  | 'coursesCatalogNotReady'
  | 'coursesNoMatch'
  | 'coursesUndergraduate'
  | 'coursesPostgraduate'
  | 'coursesInCatalog'
  | 'coursesBackToCourses'
  | 'coursesBackToHome'
  | 'coursesSeller'
  | 'coursesSellers'
  | 'coursesMaterial'
  | 'coursesMaterials'
  | 'coursesGrades'
  | 'coursesNewest'
  | 'coursesMultipleEntries'
  | 'coursesGradeTierLegend'
  | 'coursesNoNotesTitle'
  | 'coursesNoNotesBody'
  | 'cartPageSubtitle'
  | 'cartBuyMoreFree'
  | 'cartBuyMoreFreePlural'
  | 'cartBuy3Get1Applied'
  | 'cartBuy3Get1Free'
  | 'cartFree'
  | 'cartRemoveFailed'
  | 'completeProfileTitle'
  | 'completeProfileWelcome'
  | 'completeProfileSubtitle'
  | 'completeProfileFullNamePlaceholder'
  | 'completeProfileSelectSchool'
  | 'completeProfileSchoolRequired'
  | 'completeProfileSaveFailed'
  | 'completeProfileSaveUnexpected'
  | 'completeProfileSaving'
  | 'checkoutNothingTitle'
  | 'checkoutNothingBody'
  | 'checkoutBrowseCourses'
  | 'checkoutPaymentCancelled'
  | 'checkoutPaymentMethod'
  | 'checkoutPaymentMethodDesc'
  | 'checkoutFpsTitle'
  | 'checkoutFpsDesc'
  | 'checkoutCardTitle'
  | 'checkoutCardDesc'
  | 'checkoutBalanceTitle'
  | 'checkoutBalanceDesc'
  | 'checkoutItems'
  | 'checkoutTotalDue'
  | 'checkoutDiscount'
  | 'checkoutRedirecting'
  | 'checkoutContinueFps'
  | 'checkoutPayWithCard'
  | 'checkoutBackToCart'
  | 'checkoutStartFailed'
  | 'checkoutUrlMissing'
  | 'fpsPaymentSubmitted'
  | 'fpsPaymentSubmittedBody'
  | 'fpsPaymentSubmittedHint'
  | 'fpsViewOrderStatus'
  | 'fpsPayTitle'
  | 'fpsPaySubtitle'
  | 'fpsAmount'
  | 'fpsScanBankingApp'
  | 'fpsQrAlt'
  | 'fpsQrFailed'
  | 'fpsScanHint'
  | 'fpsNumber'
  | 'fpsCopied'
  | 'fpsCopy'
  | 'fpsPayTo'
  | 'fpsPaymentReference'
  | 'fpsReferenceHint'
  | 'fpsBankRefLabel'
  | 'fpsBankRefPlaceholder'
  | 'fpsSubmitting'
  | 'fpsCompletedPayment'
  | 'fpsUnlockHint'
  | 'fpsSubmitFailed'
  | 'checkoutSuccessTitle'
  | 'checkoutSuccessBody'
  | 'checkoutSuccessOrderId'
  | 'checkoutSuccessViewPurchases'
  | 'checkoutSuccessBrowseMore'
  | 'checkoutSuccessUnlockedTitle'
  | 'checkoutSuccessUnlockedBody'
  | 'checkoutPageTitle'
  | 'checkoutPageSubtitle'
  | 'ordersPageTitle'
  | 'ordersPageSubtitle'
  | 'ordersLoading'
  | 'ordersEmpty'
  | 'ordersLoadFailed'
  | 'ordersStatusPaid'
  | 'ordersStatusWaiting'
  | 'ordersStatusPending'
  | 'ordersStatusCancelled'
  | 'ordersContinuePayment'
  | 'ordersDownloads'
  | 'placeholderWalletDesc'
  | 'placeholderSalesDesc'
  | 'placeholderSettingsDesc'
  | 'purchasesPageTitle'
  | 'purchasesPageSubtitle'
  | 'purchasesLoading'
  | 'purchasesEmpty'
  | 'purchasesEmptyBrowse'
  | 'purchasesLoadFailed'
  | 'courseListingsTitle'
  | 'courseListingsMetaOne'
  | 'courseListingsMetaMany'
  | 'courseListingsSortNewest'
  | 'courseListingsSortGrade'
  | 'courseListingsSortPriceAsc'
  | 'courseListingsSortPriceDesc'
  | 'addToCart';

const en: Record<MessageKey, string> = {
  profileTitle: 'Profile',
  closeProfile: 'Close profile',
  username: 'Username',
  email: 'Email',
  school: 'School',
  memberSince: 'Member Since',
  editUsername: 'Edit username',
  saveUsername: 'Save username',
  language: 'Language',
  themeMode: 'Theme Mode',
  languageHint: 'English is the current interface language.',
  themeHint: 'Light Blue is the current Ustudy theme.',
  updatePassword: 'Update Password',
  currentPassword: 'Current Password',
  newPassword: 'New Password',
  confirmPassword: 'Confirm New Password',
  updatePasswordButton: 'Update Password',
  updatingPassword: 'Updating...',
  logout: 'Log out',
  fullNameRequired: 'Full name is required.',
  schoolRequiredBeforeUsername: 'Add your school in account setup before changing your username.',
  loadProfileFailed: 'Failed to load profile.',
  profileMissing: 'Profile data is missing.',
  loadProfileUnexpected: 'Unable to load your profile right now.',
  updateNameFailed: 'Failed to update name.',
  updateNameUnexpected: 'An unexpected error occurred. Please try again.',
  passwordAllFields: 'Please fill in all password fields.',
  passwordMinLength: 'New password must be at least 8 characters.',
  passwordMismatch: 'New password and confirmation do not match.',
  passwordChangeFailed: 'Failed to change password.',
  passwordChangeUnexpected: 'An unexpected error occurred. Please try again.',
  navBrowser: 'Browser',
  navCart: 'Cart',
  navUploader: 'Uploader',
  navCourses: 'Courses',
  navLocker: 'Locker',
  navLogin: 'Log in',
  navRegister: 'Register',
  navSupport: 'Support',
  navBrowse: 'Browse',
  navUpload: 'Upload',
  navVerify: 'Verify',
  navAccount: 'Account',
  navQueue: 'Queue',
  sellerNotesUpload: 'Notes Upload',
  sellerVerifySeller: 'Verify Seller',
  footerTagline1: 'Secure note trading for uStudy students.',
  footerTagline2: 'Elevate your learning experience.',
  footerCopyright: 'Ustudy Notes Platform. All rights reserved.',
  footerPlatform: 'Platform',
  footerPolicies: 'Policies',
  footerHelp: 'Help',
  footerBrowse: 'Browse',
  footerPrivacy: 'Privacy',
  footerTermsOfUse: 'Terms of use',
  footerMyAccount: 'My Account',
  footerSupport: 'Support',
  footerContactUs: 'Contact Us',
  footerTermsOfService: 'Terms of Service',
  footerPrivacyPolicy: 'Privacy Policy',
  homeTitleLine1: 'Find course notes from',
  homeTitleLine2: 'University students',
  homeSubtitle: 'Browse verified notes by course, semester, and grade. Buy securely and download instantly.',
  homeNoNotesTitle: 'No notes yet',
  homeNoNotesBody:
    'Published notes will show up here once sellers upload and admins approve them. You can already browse all University courses using search.',
  homeBecomeSeller: 'Become a seller',
  lockerRoom: 'Locker Room',
  lockerOverview: 'Overview',
  lockerOrders: 'Orders',
  lockerPurchases: 'Purchases',
  lockerSales: 'Sales',
  lockerWallet: 'Wallet',
  lockerGradeVerification: 'Grade Verification',
  lockerVerifiedCourses: 'Verified Courses',
  lockerSettings: 'Settings',
  lockerPageTitle: 'Locker Room',
  lockerPageSubtitle:
    'Manage orders, sales, verification, and seller tools. Open your avatar in the top bar to edit username, password, and profile photo.',
  lockerAccountStatus: 'Account status',
  lockerVerifiedSeller: 'Verified Seller',
  lockerBuyerStatus: 'Buyer (verification required)',
  lockerPrimaryAction: 'Primary action',
  lockerUploadNotes: 'Upload Notes',
  lockerVerifySeller: 'Verify Seller',
  lockerOrdersDesc: 'Track note purchases and order history.',
  lockerPurchasesDesc: 'Review everything you have bought.',
  lockerSalesDesc: 'See notes you have sold and earnings activity.',
  lockerWalletDesc: 'Manage payouts and wallet balance.',
  lockerGradeVerificationDesc: 'Track transcript review and seller verification.',
  lockerVerifiedCoursesDesc: 'Courses unlocked from your approved transcript.',
  lockerSettingsDesc: 'Notification and account preferences.',
  cartEmptyTitle: 'Your cart is empty',
  cartEmptyBody: 'Browse course notes and add materials here before checkout.',
  cartBrowseNotes: 'Browse notes',
  cartTitle: 'Shopping Cart',
  cartOrderSummary: 'Order summary',
  cartRemove: 'Remove',
  cartCheckout: 'Proceed to checkout',
  cartSubtotal: 'Subtotal',
  cartTotal: 'Total',
  cartContinueShopping: 'Continue shopping',
  authWelcomeTitle: 'Welcome to Ustudy',
  authSignInSubtitle: 'Sign in to access your study materials.',
  authEmail: 'Email',
  authPassword: 'Password',
  authRememberMe: 'Remember me for 30 days',
  authLogin: 'Login in',
  authLoggingIn: 'Logging in...',
  authForgotPassword: 'Forgot password?',
  authResetPassword: 'Reset password',
  authResendVerification: 'Resend verification email',
  authOr: 'OR',
  authNewToUstudy: 'New study to ustudy.dev?',
  authCreateAccount: 'Create Account',
  authEnterEmailPassword: 'Please enter email and password',
  authVerifyEmailFirst: 'Please verify your email before logging in.',
  authInvalidCredentials: 'Invalid email or password.',
  authSessionNotReady: 'Login succeeded but session is not ready yet. Please try again.',
  authRegisterTitle: 'Create your account',
  authRegisterSubtitle: 'Join Ustudy to buy and sell course notes.',
  authFullName: 'Full name',
  authConfirmPassword: 'Confirm password',
  authAgreeTerms: 'I agree to the Terms of Service and Privacy Policy',
  authCreatingAccount: 'Creating account...',
  authAlreadyHaveAccount: 'Already have an account?',
  commonLoading: 'Loading...',
  commonSave: 'Save',
  commonCancel: 'Cancel',
  commonBack: 'Back',
  commonContinue: 'Continue',
  commonSubmit: 'Submit',
  commonError: 'Something went wrong.',
  commonSuccess: 'Success',
  metaTitle: 'Ustudy Notes Trading Platform',
  metaDescription: 'Secure note trading platform for university students',
  authEmailRequired: 'Email is required',
  authEmailDomainOnly: 'Only @ust.hk or @connect.ust.hk email addresses are allowed (except {exception}).',
  authPasswordRequired: 'Password is required',
  authPasswordMin8: 'Password must be at least 8 characters',
  authAgreeTermsRequired: 'You must agree to the terms and conditions',
  authRegistrationFailed: 'Registration failed',
  authRegisterEmailHint: 'Use your @ust.hk or @connect.ust.hk email address',
  authPasswordMinHint: 'Minimum 8 characters',
  authTermsOfService: 'Terms of Service',
  authPrivacyPolicy: 'Privacy Policy',
  authAgreeTermsPrefix: 'I agree to the',
  authAnd: 'and',
  authForgotPasswordTitle: 'Reset your password',
  authForgotPasswordSubtitle: 'Enter your email to receive a reset link.',
  authEnterEmail: 'Please enter your email address.',
  authResetEmailFailed: 'Unable to send reset email right now. Please try again.',
  authResetEmailSuccess: 'If this email is registered, a password reset link has been sent. Please check your inbox.',
  authResetLinkExpiry: 'For security, reset links expire after 60 minutes.',
  authSendingResetLink: 'Sending reset link...',
  authSendResetLink: 'Send Reset Link',
  authRememberPassword: 'Remember your password?',
  authBackToLogin: 'Back to login',
  authVerifySuccessTitle: 'Email Verified!',
  authVerifySuccessBody: 'Your account is ready. Redirecting to login...',
  authVerifyTitle: 'Verify Your Email',
  authVerifySentTo: 'We sent a verification code to {email}',
  authVerification: 'Verification',
  authInvalidVerificationCode: 'Please enter a valid verification code',
  authVerificationFailed: 'Verification failed',
  authEnterVerificationCode: 'Please enter the verification code',
  authVerificationCode: 'Verification Code',
  authPasteCodePlaceholder: 'Paste the code from your email',
  authLastCodeSentAt: 'Last code sent at {time}',
  authCodeEndsWith: 'ends with {fingerprint}',
  authVerifyCodeHint:
    'You can paste either the token or full verification link. After resend, only the latest code works.',
  authVerifying: 'Verifying...',
  authVerifyEmail: 'Verify Email',
  authEmailForResend: 'Email for resend',
  authDidntReceiveEmail: "Didn't receive the email?",
  authSending: 'Sending...',
  authResendVerificationEmail: 'Resend Verification Email',
  authResentCount: 'Resent {count}/{max} times today',
  authEnterEmailForResend: 'Enter your University email address to resend the verification email.',
  authResendMaxExceeded: 'You have exceeded the maximum resend attempts ({max} per day). Please try again tomorrow.',
  authResendFailed: 'Failed to resend email',
  authResendEligible: 'If this email is eligible, we sent a verification email.',
  authNewVerificationSent: 'New verification email sent at {time}. Check your inbox. Older codes no longer work.',
  authSetNewPasswordTitle: 'Set New Password',
  authSetNewPasswordSubtitle: 'Choose a new password for your account',
  authFillBothPasswordFields: 'Please fill in both password fields.',
  authPasswordsDoNotMatch: 'Passwords do not match.',
  authUpdatePasswordFailed: 'Unable to update password. Please request a new reset link.',
  authPasswordUpdatedSuccess: 'Password updated successfully. Redirecting to login...',
  authValidatingResetLink: 'Validating reset link...',
  authResetLinkExpired: 'Reset links expire after 60 minutes. Request a new link to continue.',
  authRequestNewResetLink: 'Request New Reset Link',
  authNewPasswordPlaceholder: 'At least 8 characters',
  authConfirmPasswordPlaceholder: 'Re-enter new password',
  authResetLinkExpiryNote: 'This reset link expires 60 minutes after it is issued.',
  authBackToLoginPrefix: 'Back to',
  learnGrowAchieveTitleLearn: 'Learn.',
  learnGrowAchieveTitleGrow: 'Grow',
  learnGrowAchieveTitleAchieve: 'Achieve.',
  learnGrowAchieveBody:
    'Everything you need to make the most of your university journey — from discovering what to learn, tracking your progress, and building a record of everything you achieve.',
  learnGrowAchieveView: 'View',
  publishNotesTitle: 'Publish Notes',
  publishNotesGroupByCourse: 'Group notes by course',
  publishNotesShowSeparately: 'Show notes separately',
  showMore: 'Show more',
  featuredLatestUploads: 'Featured latest uploads',
  featuredPrevNotes: 'Previous featured notes',
  featuredNextNotes: 'Next featured notes',
  courseSearchPlaceholder: 'Search by Course Code or title',
  courseSearchAriaLabel: 'Search by course code or title',
  courseSearchButton: 'Search',
  courseSearchBrowseHint: 'Browse all 3,700+ University undergraduate and postgraduate courses',
  courseSearchPlaceholderLong: 'Search by course code or title (e.g. COMP2011)',
  noteGrades: 'Grades',
  noteFiles: 'Files',
  noteLanguage: 'Language',
  noteViewMaterials: 'View materials',
  noteStudyMaterial: 'Study material',
  noteSeller: 'Seller',
  noteUploaded: 'Uploaded',
  noteView: 'View',
  noteBuy: 'Buy',
  purchasePreparingDownload: 'Preparing download...',
  purchaseViewDownload: 'View / Download notes',
  purchaseDownloadFailed: 'Download failed.',
  purchasePaymentConfirmed: 'Payment confirmed. Your note is available.',
  purchaseDownloadAnytime: 'Download full note pack',
  purchaseUnlockedBody: 'Payment confirmed. The full note pack is unlocked — download anytime.',
  purchaseOpenNote: 'Open note',
  coursesFindTitle: 'Find Your Course',
  coursesAllLevels: 'All levels',
  coursesCourseFound: 'course found',
  coursesCoursesFound: 'courses found',
  coursesPrevPage: 'Previous page',
  coursesNextPage: 'Next page',
  coursesPageOf: '{page} of {totalPages}',
  coursesCatalogNotReady:
    'Course catalog is not ready. Run docs/migrations/019_courses_catalog.sql and npm run seed:courses.',
  coursesNoMatch: 'No courses matched your search.',
  coursesUndergraduate: 'Undergraduate',
  coursesPostgraduate: 'Postgraduate',
  coursesInCatalog: 'course in the university catalog.',
  coursesBackToCourses: '← Back to courses',
  coursesBackToHome: '← Back to home',
  coursesSeller: 'seller',
  coursesSellers: 'sellers',
  coursesMaterial: 'material',
  coursesMaterials: 'materials',
  coursesGrades: 'Grades',
  coursesNewest: 'Newest',
  coursesMultipleEntries: 'Multiple catalog entries for this code',
  coursesGradeTierLegend: 'Grade tier legend',
  coursesNoNotesTitle: 'No notes yet for this course',
  coursesNoNotesBody: 'Verified sellers can upload notes once they pass grade verification for {code}.',
  cartPageSubtitle: 'Review note listings before checkout.',
  cartBuyMoreFree: 'Buy {count} more note to get one free',
  cartBuyMoreFreePlural: 'Buy {count} more notes to get one free',
  cartBuy3Get1Applied: 'Buy 3 get 1 free applied — the lowest-priced note is free.',
  cartBuy3Get1Free: 'Buy 3 get 1 free',
  cartFree: 'Free',
  cartRemoveFailed: 'Failed to remove item',
  completeProfileTitle: 'Complete Your Profile',
  completeProfileWelcome: 'Welcome to UStudy!',
  completeProfileSubtitle: 'Please complete your profile before continuing.',
  completeProfileFullNamePlaceholder: 'Enter your full name',
  completeProfileSelectSchool: 'Select your school',
  completeProfileSchoolRequired: 'Please select your school.',
  completeProfileSaveFailed: 'Failed to save profile.',
  completeProfileSaveUnexpected: 'Unable to save your profile. Please try again.',
  completeProfileSaving: 'Saving...',
  checkoutNothingTitle: 'Nothing to checkout',
  checkoutNothingBody: 'Add notes to your cart before paying.',
  checkoutBrowseCourses: 'Browse courses',
  checkoutPaymentCancelled: 'Payment was cancelled. You can try again when ready.',
  checkoutPaymentMethod: 'Payment method',
  checkoutPaymentMethodDesc: 'Pay with FPS. Notes unlock after we confirm the transfer.',
  checkoutFpsTitle: 'FPS / bank transfer',
  checkoutFpsDesc: 'Pay HK$ via FPS. Notes stay locked until we confirm the transfer in the bank.',
  checkoutCardTitle: 'Credit / debit card',
  checkoutCardDesc: 'Pay securely with Stripe. International cards are not supported at launch.',
  checkoutBalanceTitle: 'Stored balance',
  checkoutBalanceDesc: 'Coming soon — top up your wallet to pay without a card.',
  checkoutItems: 'Items',
  checkoutTotalDue: 'Total due',
  checkoutDiscount: 'Discount',
  checkoutRedirecting: 'Redirecting...',
  checkoutContinueFps: 'Continue to FPS payment',
  checkoutPayWithCard: 'Pay with card',
  checkoutBackToCart: 'Back to cart',
  checkoutStartFailed: 'Failed to start checkout',
  checkoutUrlMissing: 'Checkout URL was not returned',
  fpsPaymentSubmitted: 'Payment submitted',
  fpsPaymentSubmittedBody: 'Your notes stay locked until we confirm {amount} in the bank against {reference}.',
  fpsPaymentSubmittedHint: 'This usually takes a short while after you send the FPS transfer.',
  fpsViewOrderStatus: 'View order status',
  fpsPayTitle: 'Pay via FPS',
  fpsPaySubtitle: 'Transfer {amount} and enter {reference} as the payment reference.',
  fpsAmount: 'Amount',
  fpsScanBankingApp: 'Scan with your banking app',
  fpsQrAlt: 'FPS payment QR code',
  fpsQrFailed: 'QR could not be generated. Send FPS to the number below.',
  fpsScanHint: 'Scan this QR in your banking app, then send {amount} and enter {reference} as the payment message.',
  fpsNumber: 'FPS number',
  fpsCopied: 'Copied',
  fpsCopy: 'Copy',
  fpsPayTo: 'Pay to {name}',
  fpsPaymentReference: 'Payment reference',
  fpsReferenceHint: 'Put this in the FPS message / reference so we can match your transfer.',
  fpsBankRefLabel: 'Your bank transaction / reference number (optional)',
  fpsBankRefPlaceholder: 'From your banking app',
  fpsSubmitting: 'Submitting...',
  fpsCompletedPayment: "I've completed payment",
  fpsUnlockHint: 'Clicking this does not unlock notes. We unlock them after {amount} shows up in the bank.',
  fpsSubmitFailed: 'Failed to submit payment.',
  checkoutSuccessTitle: 'Payment successful',
  checkoutSuccessBody: 'Your order has been placed. Purchased notes will appear in your account once payment is confirmed.',
  checkoutSuccessOrderId: 'Order ID:',
  checkoutSuccessViewPurchases: 'View purchases',
  checkoutSuccessBrowseMore: 'Browse more notes',
  checkoutSuccessUnlockedTitle: 'Notes unlocked',
  checkoutSuccessUnlockedBody: 'Payment is confirmed. The full note pack is yours — download it anytime from here or Purchases.',
  checkoutPageTitle: 'Checkout',
  checkoutPageSubtitle: 'Pay with FPS. Notes unlock after the transfer is confirmed.',
  ordersPageTitle: 'Orders',
  ordersPageSubtitle: 'Track FPS transfers. Notes unlock only after we confirm payment.',
  ordersLoading: 'Loading...',
  ordersEmpty: 'You have no orders yet.',
  ordersLoadFailed: 'Failed to load orders.',
  ordersStatusPaid: 'Paid',
  ordersStatusWaiting: 'Waiting for confirmation',
  ordersStatusPending: 'Pending payment',
  ordersStatusCancelled: 'Cancelled',
  ordersContinuePayment: 'Continue payment',
  ordersDownloads: 'Downloads',
  placeholderWalletDesc: 'Wallet balance and payout settings will appear here.',
  placeholderSalesDesc: 'Your note sales and earnings activity will appear here.',
  placeholderSettingsDesc: 'Notification and account settings will appear here.',
  purchasesPageTitle: 'Purchases',
  purchasesPageSubtitle: 'Notes appear here only after FPS payment is confirmed.',
  purchasesLoading: 'Loading...',
  purchasesEmpty: 'No confirmed purchases yet.',
  purchasesEmptyBrowse: 'Browse courses',
  purchasesLoadFailed: 'Failed to load purchases.',
  courseListingsTitle: 'Available notes',
  courseListingsMetaOne: '{count} seller · compare grades, price, and materials',
  courseListingsMetaMany: '{count} sellers · compare grades, price, and materials',
  courseListingsSortNewest: 'Newest',
  courseListingsSortGrade: 'Highest grade',
  courseListingsSortPriceAsc: 'Lowest price',
  courseListingsSortPriceDesc: 'Highest price',
  addToCart: 'Add to cart',
};

const zhCN: Record<MessageKey, string> = {
  profileTitle: '个人资料',
  closeProfile: '关闭个人资料',
  username: '用户名',
  email: '邮箱',
  school: '学院',
  memberSince: '加入日期',
  editUsername: '编辑用户名',
  saveUsername: '保存用户名',
  language: '语言',
  themeMode: '主题模式',
  languageHint: '中文为当前的界面语言。',
  themeHint: '浅蓝色为当前的 Ustudy 主题。',
  updatePassword: '更新密码',
  currentPassword: '当前密码',
  newPassword: '新密码',
  confirmPassword: '确认新密码',
  updatePasswordButton: '更新密码',
  updatingPassword: '更新中…',
  logout: '登出',
  fullNameRequired: '请输入全名。',
  schoolRequiredBeforeUsername: '请先在账户设置中添加学院，才能更改用户名。',
  loadProfileFailed: '无法加载个人资料。',
  profileMissing: '找不到个人资料。',
  loadProfileUnexpected: '目前无法加载您的个人资料。',
  updateNameFailed: '无法更新名称。',
  updateNameUnexpected: '发生未知错误，请稍后再试。',
  passwordAllFields: '请填写所有密码字段。',
  passwordMinLength: '新密码至少需要 8 个字符。',
  passwordMismatch: '新密码与确认密码不一致。',
  passwordChangeFailed: '无法更新密码。',
  passwordChangeUnexpected: '发生未知错误，请稍后再试。',
  navBrowser: '浏览',
  navCart: '购物车',
  navUploader: '上传',
  navCourses: '课程',
  navLocker: '储物柜',
  navLogin: '登录',
  navRegister: '注册',
  navSupport: '支持',
  navBrowse: '浏览',
  navUpload: '上传',
  navVerify: '验证',
  navAccount: '账户',
  navQueue: '队列',
  sellerNotesUpload: '笔记上传',
  sellerVerifySeller: '卖家验证',
  footerTagline1: '为 uStudy 学生提供安全的笔记交易。',
  footerTagline2: '提升你的学习体验。',
  footerCopyright: 'Ustudy 笔记平台。保留所有权利。',
  footerPlatform: '平台',
  footerPolicies: '政策',
  footerHelp: '帮助',
  footerBrowse: '浏览',
  footerPrivacy: '隐私',
  footerTermsOfUse: '使用条款',
  footerMyAccount: '我的账户',
  footerSupport: '支持',
  footerContactUs: '联系我们',
  footerTermsOfService: '服务条款',
  footerPrivacyPolicy: '隐私政策',
  homeTitleLine1: '寻找来自',
  homeTitleLine2: '大学学生的课程笔记',
  homeSubtitle: '按课程、学期和成绩浏览已验证笔记。安全购买，即时下载。',
  homeNoNotesTitle: '暂无笔记',
  homeNoNotesBody: '卖家上传并经管理员批准后，已发布的笔记将显示在这里。您已经可以使用搜索浏览所有大学课程。',
  homeBecomeSeller: '成为卖家',
  lockerRoom: '储物柜',
  lockerOverview: '概览',
  lockerOrders: '订单',
  lockerPurchases: '购买记录',
  lockerSales: '销售',
  lockerWallet: '钱包',
  lockerGradeVerification: '成绩验证',
  lockerVerifiedCourses: '已验证课程',
  lockerSettings: '设置',
  lockerPageTitle: '储物柜',
  lockerPageSubtitle: '管理订单、销售、验证和卖家工具。点击顶部栏头像可编辑用户名、密码和头像。',
  lockerAccountStatus: '账户状态',
  lockerVerifiedSeller: '已验证卖家',
  lockerBuyerStatus: '买家（需要验证）',
  lockerPrimaryAction: '主要操作',
  lockerUploadNotes: '上传笔记',
  lockerVerifySeller: '验证卖家',
  lockerOrdersDesc: '跟踪笔记购买和订单历史。',
  lockerPurchasesDesc: '查看您购买的所有内容。',
  lockerSalesDesc: '查看您售出的笔记和收入活动。',
  lockerWalletDesc: '管理提现和钱包余额。',
  lockerGradeVerificationDesc: '跟踪成绩单审核和卖家验证。',
  lockerVerifiedCoursesDesc: '从已批准的成绩单解锁的课程。',
  lockerSettingsDesc: '通知和账户偏好设置。',
  cartEmptyTitle: '您的购物车是空的',
  cartEmptyBody: '浏览课程笔记并在结账前将资料添加到这里。',
  cartBrowseNotes: '浏览笔记',
  cartTitle: '购物车',
  cartOrderSummary: '订单摘要',
  cartRemove: '移除',
  cartCheckout: '前往结账',
  cartSubtotal: '小计',
  cartTotal: '总计',
  cartContinueShopping: '继续购物',
  authWelcomeTitle: '欢迎使用 Ustudy',
  authSignInSubtitle: '登录以访问您的学习资料。',
  authEmail: '邮箱',
  authPassword: '密码',
  authRememberMe: '记住我 30 天',
  authLogin: '登录',
  authLoggingIn: '登录中…',
  authForgotPassword: '忘记密码？',
  authResetPassword: '重置密码',
  authResendVerification: '重新发送验证邮件',
  authOr: '或',
  authNewToUstudy: '刚加入 ustudy.dev？',
  authCreateAccount: '创建账户',
  authEnterEmailPassword: '请输入邮箱和密码',
  authVerifyEmailFirst: '请先验证您的邮箱后再登录。',
  authInvalidCredentials: '邮箱或密码无效。',
  authSessionNotReady: '登录成功但会话尚未就绪，请重试。',
  authRegisterTitle: '创建您的账户',
  authRegisterSubtitle: '加入 Ustudy，买卖课程笔记。',
  authFullName: '全名',
  authConfirmPassword: '确认密码',
  authAgreeTerms: '我同意服务条款和隐私政策',
  authCreatingAccount: '创建账户中…',
  authAlreadyHaveAccount: '已有账户？',
  commonLoading: '加载中…',
  commonSave: '保存',
  commonCancel: '取消',
  commonBack: '返回',
  commonContinue: '继续',
  commonSubmit: '提交',
  commonError: '出了点问题。',
  commonSuccess: '成功',
  metaTitle: 'Ustudy 笔记交易平台',
  metaDescription: '为大学生提供安全的笔记交易平台',
  authEmailRequired: '请输入邮箱。',
  authEmailDomainOnly: '仅允许 @ust.hk 或 @connect.ust.hk 邮箱（{exception} 除外）。',
  authPasswordRequired: '请输入密码。',
  authPasswordMin8: '密码至少需要 8 个字符。',
  authAgreeTermsRequired: '您必须同意条款和条件。',
  authRegistrationFailed: '注册失败。',
  authRegisterEmailHint: '请使用 @ust.hk 或 @connect.ust.hk 邮箱',
  authPasswordMinHint: '至少 8 个字符',
  authTermsOfService: '服务条款',
  authPrivacyPolicy: '隐私政策',
  authAgreeTermsPrefix: '我同意',
  authAnd: '和',
  authForgotPasswordTitle: '重置密码',
  authForgotPasswordSubtitle: '输入邮箱以接收重置链接。',
  authEnterEmail: '请输入您的邮箱地址。',
  authResetEmailFailed: '目前无法发送重置邮件，请稍后再试。',
  authResetEmailSuccess: '如果该邮箱已注册，我们已发送密码重置链接，请查收邮件。',
  authResetLinkExpiry: '出于安全考虑，重置链接在 60 分钟后失效。',
  authSendingResetLink: '发送重置链接中…',
  authSendResetLink: '发送重置链接',
  authRememberPassword: '记得密码？',
  authBackToLogin: '返回登录',
  authVerifySuccessTitle: '邮箱已验证！',
  authVerifySuccessBody: '您的账户已就绪，正在跳转到登录页…',
  authVerifyTitle: '验证您的邮箱',
  authVerifySentTo: '我们已向 {email} 发送验证码',
  authVerification: '验证',
  authInvalidVerificationCode: '请输入有效的验证码',
  authVerificationFailed: '验证失败',
  authEnterVerificationCode: '请输入验证码',
  authVerificationCode: '验证码',
  authPasteCodePlaceholder: '粘贴邮件中的验证码',
  authLastCodeSentAt: '上次发送时间 {time}',
  authCodeEndsWith: '末尾为 {fingerprint}',
  authVerifyCodeHint: '可粘贴验证码或完整验证链接。重新发送后，仅最新验证码有效。',
  authVerifying: '验证中…',
  authVerifyEmail: '验证邮箱',
  authEmailForResend: '重新发送用的邮箱',
  authDidntReceiveEmail: '没有收到邮件？',
  authSending: '发送中…',
  authResendVerificationEmail: '重新发送验证邮件',
  authResentCount: '今日已重发 {count}/{max} 次',
  authEnterEmailForResend: '请输入您的大学邮箱以重新发送验证邮件。',
  authResendMaxExceeded: '已超过每日最大重发次数（{max} 次），请明天再试。',
  authResendFailed: '无法重新发送邮件',
  authResendEligible: '如果该邮箱符合条件，我们已发送验证邮件。',
  authNewVerificationSent: '已于 {time} 发送新验证邮件，请查收。旧验证码已失效。',
  authSetNewPasswordTitle: '设置新密码',
  authSetNewPasswordSubtitle: '为您的账户选择新密码',
  authFillBothPasswordFields: '请填写两个密码字段。',
  authPasswordsDoNotMatch: '两次输入的密码不一致。',
  authUpdatePasswordFailed: '无法更新密码，请重新申请重置链接。',
  authPasswordUpdatedSuccess: '密码已更新，正在跳转到登录页…',
  authValidatingResetLink: '正在验证重置链接…',
  authResetLinkExpired: '重置链接在 60 分钟后失效，请申请新链接后继续。',
  authRequestNewResetLink: '申请新的重置链接',
  authNewPasswordPlaceholder: '至少 8 个字符',
  authConfirmPasswordPlaceholder: '再次输入新密码',
  authResetLinkExpiryNote: '此重置链接在发出后 60 分钟内有效。',
  authBackToLoginPrefix: '返回',
  learnGrowAchieveTitleLearn: '学习。',
  learnGrowAchieveTitleGrow: '成长',
  learnGrowAchieveTitleAchieve: '成就。',
  learnGrowAchieveBody:
    '助力您的大学之旅——从发现学习内容、跟踪进度，到记录每一项成就，一应俱全。',
  learnGrowAchieveView: '查看',
  publishNotesTitle: '已发布笔记',
  publishNotesGroupByCourse: '按课程分组',
  publishNotesShowSeparately: '单独显示笔记',
  showMore: '显示更多',
  featuredLatestUploads: '精选最新上传',
  featuredPrevNotes: '上一组精选笔记',
  featuredNextNotes: '下一组精选笔记',
  courseSearchPlaceholder: '按课程代码或名称搜索',
  courseSearchAriaLabel: '按课程代码或名称搜索',
  courseSearchButton: '搜索',
  courseSearchBrowseHint: '浏览 3,700+ 门大学本科与研究生课程',
  courseSearchPlaceholderLong: '按课程代码或名称搜索（如 COMP2011）',
  noteGrades: '成绩',
  noteFiles: '文件',
  noteLanguage: '语言',
  noteViewMaterials: '查看资料',
  noteStudyMaterial: '学习资料',
  noteSeller: '卖家',
  noteUploaded: '上传时间',
  noteView: '查看',
  noteBuy: '购买',
  purchasePreparingDownload: '准备下载中…',
  purchaseViewDownload: '查看 / 下载笔记',
  purchaseDownloadFailed: '下载失败。',
  purchasePaymentConfirmed: '付款已确认，笔记已可用。',
  purchaseDownloadAnytime: '下载完整笔记包',
  purchaseUnlockedBody: '付款已确认。完整笔记包已解锁，可随时下载。',
  purchaseOpenNote: '打开笔记',
  coursesFindTitle: '查找您的课程',
  coursesAllLevels: '全部级别',
  coursesCourseFound: '门课程',
  coursesCoursesFound: '门课程',
  coursesPrevPage: '上一页',
  coursesNextPage: '下一页',
  coursesPageOf: '第 {page} 页，共 {totalPages} 页',
  coursesCatalogNotReady: '课程目录尚未就绪。请运行 docs/migrations/019_courses_catalog.sql 和 npm run seed:courses。',
  coursesNoMatch: '没有匹配您搜索条件的课程。',
  coursesUndergraduate: '本科',
  coursesPostgraduate: '研究生',
  coursesInCatalog: '课程（大学目录）。',
  coursesBackToCourses: '← 返回课程列表',
  coursesBackToHome: '← 返回首页',
  coursesSeller: '位卖家',
  coursesSellers: '位卖家',
  coursesMaterial: '份资料',
  coursesMaterials: '份资料',
  coursesGrades: '成绩',
  coursesNewest: '最新',
  coursesMultipleEntries: '该代码有多条目录记录',
  coursesGradeTierLegend: '成绩等级说明',
  coursesNoNotesTitle: '该课程暂无笔记',
  coursesNoNotesBody: '卖家通过 {code} 的成绩验证后即可上传笔记。',
  cartPageSubtitle: '结账前请核对购物车中的笔记。',
  cartBuyMoreFree: '再购买 {count} 份笔记即可获赠 1 份',
  cartBuyMoreFreePlural: '再购买 {count} 份笔记即可获赠 1 份',
  cartBuy3Get1Applied: '已应用买 3 送 1——价格最低的笔记免费。',
  cartBuy3Get1Free: '买 3 送 1',
  cartFree: '免费',
  cartRemoveFailed: '无法移除商品',
  completeProfileTitle: '完善您的资料',
  completeProfileWelcome: '欢迎使用 UStudy！',
  completeProfileSubtitle: '请先完善资料后再继续。',
  completeProfileFullNamePlaceholder: '输入您的全名',
  completeProfileSelectSchool: '选择您的学院',
  completeProfileSchoolRequired: '请选择您的学院。',
  completeProfileSaveFailed: '无法保存资料。',
  completeProfileSaveUnexpected: '无法保存您的资料，请稍后再试。',
  completeProfileSaving: '保存中…',
  checkoutNothingTitle: '没有可结账的商品',
  checkoutNothingBody: '请先添加笔记到购物车再付款。',
  checkoutBrowseCourses: '浏览课程',
  checkoutPaymentCancelled: '付款已取消，准备好后可重试。',
  checkoutPaymentMethod: '付款方式',
  checkoutPaymentMethodDesc: '通过 FPS 付款。我们确认转账后才会解锁笔记。',
  checkoutFpsTitle: 'FPS / 银行转账',
  checkoutFpsDesc: '通过 FPS 支付港币。我们在银行确认转账前，笔记保持锁定。',
  checkoutCardTitle: '信用卡 / 借记卡',
  checkoutCardDesc: '通过 Stripe 安全支付。首发版本不支持国际卡。',
  checkoutBalanceTitle: '账户余额',
  checkoutBalanceDesc: '即将推出——充值钱包即可免卡支付。',
  checkoutItems: '商品',
  checkoutTotalDue: '应付总额',
  checkoutDiscount: '折扣',
  checkoutRedirecting: '跳转中…',
  checkoutContinueFps: '继续 FPS 付款',
  checkoutPayWithCard: '使用银行卡支付',
  checkoutBackToCart: '返回购物车',
  checkoutStartFailed: '无法开始结账',
  checkoutUrlMissing: '未返回结账 URL',
  fpsPaymentSubmitted: '付款已提交',
  fpsPaymentSubmittedBody: '我们在银行确认收到 {amount}（参考号 {reference}）之前，笔记保持锁定。',
  fpsPaymentSubmittedHint: '发送 FPS 转账后，通常很快即可确认。',
  fpsViewOrderStatus: '查看订单状态',
  fpsPayTitle: '通过 FPS 付款',
  fpsPaySubtitle: '转账 {amount}，并在付款参考中填写 {reference}。',
  fpsAmount: '金额',
  fpsScanBankingApp: '使用银行 App 扫码',
  fpsQrAlt: 'FPS 付款二维码',
  fpsQrFailed: '无法生成二维码，请向下方号码发送 FPS 转账。',
  fpsScanHint: '用银行 App 扫描此二维码，然后转账 {amount}，并在转账备注填写 {reference}。',
  fpsNumber: 'FPS 号码',
  fpsCopied: '已复制',
  fpsCopy: '复制',
  fpsPayTo: '收款方 {name}',
  fpsPaymentReference: '付款参考号',
  fpsReferenceHint: '请在 FPS 留言/参考中填写此号码，以便我们匹配您的转账。',
  fpsBankRefLabel: '您的银行交易/参考号（可选）',
  fpsBankRefPlaceholder: '来自银行 App',
  fpsSubmitting: '提交中…',
  fpsCompletedPayment: '我已完成付款',
  fpsUnlockHint: '点击此按钮不会解锁笔记。我们在银行收到 {amount} 后才会解锁。',
  fpsSubmitFailed: '无法提交付款。',
  checkoutSuccessTitle: '付款成功',
  checkoutSuccessBody: '订单已提交。付款确认后，购买的笔记将出现在您的账户中。',
  checkoutSuccessOrderId: '订单号：',
  checkoutSuccessViewPurchases: '查看购买记录',
  checkoutSuccessBrowseMore: '浏览更多笔记',
  checkoutSuccessUnlockedTitle: '笔记已解锁',
  checkoutSuccessUnlockedBody: '付款已确认。完整笔记包已归您所有，可在此页或“购买记录”随时下载。',
  checkoutPageTitle: '结账',
  checkoutPageSubtitle: '通过 FPS 付款。转账确认后笔记才会解锁。',
  ordersPageTitle: '订单',
  ordersPageSubtitle: '跟踪 FPS 转账。仅在确认付款后笔记才会解锁。',
  ordersLoading: '加载中…',
  ordersEmpty: '您还没有订单。',
  ordersLoadFailed: '无法加载订单。',
  ordersStatusPaid: '已付款',
  ordersStatusWaiting: '等待确认',
  ordersStatusPending: '待付款',
  ordersStatusCancelled: '已取消',
  ordersContinuePayment: '继续付款',
  ordersDownloads: '下载',
  placeholderWalletDesc: '钱包余额和提现设置将显示在这里。',
  placeholderSalesDesc: '您的笔记销售和收入活动将显示在这里。',
  placeholderSettingsDesc: '通知和账户设置将显示在这里。',
  purchasesPageTitle: '购买记录',
  purchasesPageSubtitle: '仅在 FPS 付款确认后，笔记才会显示在这里。',
  purchasesLoading: '加载中…',
  purchasesEmpty: '暂无已确认的购买记录。',
  purchasesEmptyBrowse: '浏览课程',
  purchasesLoadFailed: '无法加载购买记录。',
  courseListingsTitle: '可用笔记',
  courseListingsMetaOne: '{count} 位卖家 · 比较成绩、价格和资料',
  courseListingsMetaMany: '{count} 位卖家 · 比较成绩、价格和资料',
  courseListingsSortNewest: '最新',
  courseListingsSortGrade: '最高成绩',
  courseListingsSortPriceAsc: '最低价格',
  courseListingsSortPriceDesc: '最高价格',
  addToCart: '加入购物车',
};

export const messages: Record<AppLocale, Record<MessageKey, string>> = {
  en,
  'zh-CN': zhCN,
};

export function getMessage(locale: AppLocale, key: MessageKey) {
  return messages[locale][key];
}

/** @deprecated Use getMessage */
export function getProfileMessage(locale: AppLocale, key: MessageKey) {
  return getMessage(locale, key);
}

export type ProfileMessageKey = MessageKey;
