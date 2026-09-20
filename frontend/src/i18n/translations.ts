export type Language = 'en' | 'or' | 'hi'

export interface TranslationDict {
  'app.brand': string
  'app.tagline': string
  'nav.dashboard': string
  'nav.myFarm': string
  'nav.farmOverview': string
  'nav.production': string
  'nav.products': string
  'nav.myProducts': string
  'nav.addProduct': string
  'nav.marketplace': string
  'nav.orders': string
  'nav.newOrders': string
  'nav.activeOrders': string
  'nav.completedOrders': string
  'nav.logistics': string
  'nav.activeShipments': string
  'nav.trackShipment': string
  'nav.aiInsights': string
  'nav.recommendations': string
  'nav.notifications': string
  'nav.settings': string
  'section.overview': string
  'section.sellAndManage': string
  'section.operations': string
  'section.account': string
  'header.search': string
  'header.searchPlaceholder': string
  'header.notifications': string
  'header.help': string
  'header.profileMenu': string
  'header.language': string
  'header.languageLabel': string
  'header.logout': string
  'header.myAccount': string
  'dashboard.greetingMorning': string
  'dashboard.greetingAfternoon': string
  'dashboard.greetingEvening': string
  'dashboard.subtitle': string
  'dashboard.todayStatus': string
  'dashboard.activeCrops': string
  'dashboard.products': string
  'dashboard.newOrders': string
  'dashboard.activeShipments': string
  'dashboard.revenue': string
  'dashboard.orders': string
  'dashboard.trustScore': string
  'dashboard.activeListings': string
  'dashboard.farmOverview': string
  'dashboard.farmOverviewDesc': string
  'dashboard.activeCrops.title': string
  'dashboard.upcomingHarvest': string
  'dashboard.myCrops': string
  'dashboard.growing': string
  'dashboard.expectedHarvest': string
  'dashboard.aiMarketIntel': string
  'dashboard.aiInsightDemo': string
  'dashboard.demand': string
  'dashboard.price': string
  'dashboard.sellRange': string
  'dashboard.weather': string
  'dashboard.farmHealth': string
  'dashboard.marketPrices': string
  'dashboard.liveTracking': string
  'dashboard.noShipments': string
  'dashboard.noCrops': string
  'dashboard.viewAll': string
  'dashboard.seeForecast': string
  'common.loading': string
  'common.error': string
  'common.yes': string
  'common.no': string
  'common.close': string
  'common.search': string
  'common.kg': string
  'common.view': string
  'common.add': string
  'common.status': string
  'common.crop': string

  'navLabel.Dashboard': string
  'navLabel.AI Insights': string
  'navLabel.My Farm': string
  'navLabel.Farm Overview': string
  'navLabel.Farm Notes': string
  'navLabel.Products': string
  'navLabel.My Products': string
  'navLabel.Listings': string
  'navLabel.Inventory': string
  'navLabel.Batches': string
  'navLabel.Orders': string
  'navLabel.Contracts': string
  'navLabel.Logistics': string
  'navLabel.Logistics & Tracking': string
  'navLabel.Logistics Tracking': string
  'navLabel.Logistics Monitor': string
  'navLabel.Live Map': string
  'navLabel.Live Map Tracking': string
  'navLabel.Live Order Tracking': string
  'navLabel.Route Dispatch & Assign': string
  'navLabel.Dispatch': string
  'navLabel.AI': string
  'navLabel.Tracking': string
  'navLabel.Storage Intel': string
  'navLabel.Demands': string
  'navLabel.Profile': string
  'navLabel.Orders & Tracking': string
  'navLabel.Weather': string
  'navLabel.Marketplace': string
  'navLabel.Profile & Settings': string
  'navLabel.Notifications': string
  'navLabel.Settings': string
  'navLabel.Demand Posts': string
  'navLabel.AI Recommendations': string
  'navLabel.Browse Listings': string
  'navLabel.Onboarding': string
  'navLabel.Sourcing': string
  'navLabel.Verifications': string
  'navLabel.Trust Scores': string
  'navLabel.Disputes': string
  'navLabel.Browse Records': string
  'navLabel.Community': string
  'navLabel.Sell & Manage': string
  'navLabel.Operations': string
  'navLabel.Overview': string
  'navLabel.Support': string
  'navLabel.Data': string
  'navLabel.Account': string
  'navLabel.Home': string

  'buyer.title': string
  'buyer.subtitle': string
  'buyer.liveProduce': string
  'buyer.liveProduceHint': string
  'buyer.explore': string
  'buyer.aiMatches': string
  'buyer.aiMatchesHint': string
  'buyer.viewMatches': string
  'buyer.activeOrders': string
  'buyer.activeOrdersHint': string
  'buyer.orderCenter': string
  'buyer.publishedDemands': string
  'buyer.publishedDemandsHint': string
  'buyer.manageDemands': string
  'buyer.payments': string
  'buyer.paymentsHint': string
  'buyer.deliveries': string
  'buyer.deliveriesHint': string
  'buyer.track': string
  'buyer.postDemand': string
  'buyer.identityVerified': string
  'buyer.identity': string
  'buyer.escrowVerified': string
  'buyer.escrowPayment': string
  'buyer.profileComplete': string
  'buyer.escrowSecured': string
  'buyer.ordersLink': string
  'buyer.deposited': string
  'buyer.released': string
  'buyer.escrowAccounts': string
  'buyer.escrowAccountsPlural': string
  'buyer.escrowLinked': string
  'buyer.trustScore': string
  'buyer.reviews': string
  'buyer.trustSubtitle': string
  'buyer.trackFooter': string
  'buyer.noOrders': string

  'demand.createTitle': string
  'demand.createDesc': string
  'demand.newDemand': string
  'demand.crop': string
  'demand.chooseCrop': string
  'demand.quantity': string
  'demand.targetPrice': string
  'demand.min': string
  'demand.max': string
  'demand.requiredBy': string
  'demand.quality': string
  'demand.creating': string
  'demand.create': string
  'demand.yourDemands': string
  'demand.noDemands': string
  'demand.filterStatus': string
  'demand.all': string
  'demand.by': string
  'demand.cancel': string
  'demand.none': string
  'demand.createdDraft': string
  'demand.cancelled': string

  'rec.title': string
  'rec.desc': string
  'rec.lookingFor': string
  'rec.crop': string
  'rec.quantityNeeded': string
  'rec.priceRange': string
  'rec.yourState': string
  'rec.yourDistrict': string
  'rec.needBy': string
  'rec.quality': string
  'rec.finding': string
  'rec.find': string
  'rec.clear': string
  'rec.rankingBased': string
  'rec.selectedCrop': string
  'rec.none': string
  'rec.match': string
  'rec.why': string
  'rec.trust': string
  'rec.back': string

  'onboard.title': string
  'onboard.desc': string
  'onboard.step.buyerType': string
  'onboard.step.basic': string
  'onboard.step.identity': string
  'onboard.step.location': string
  'onboard.step.payment': string
  'onboard.step.trust': string
  'onboard.chooseDesc': string
  'onboard.continue': string
  'onboard.buyerType': string
  'onboard.choose': string
  'onboard.fullName': string
  'onboard.businessName': string
  'onboard.saving': string
  'onboard.saveContinue': string
  'onboard.identityVerify': string
  'onboard.checking': string
  'onboard.submitIdentity': string
  'onboard.continueLocation': string
  'onboard.deliverWhere': string
  'onboard.latitude': string
  'onboard.longitude': string
  'onboard.paymentVerify': string
  'onboard.submitPayment': string
  'onboard.continueTrust': string
  'onboard.reference': string
  'onboard.trustStatus': string
  'onboard.trustGrows': string
  'onboard.identity': string
  'onboard.payment': string
  'onboard.goDashboard': string
  'onboard.createDemand': string
  'onboard.chooseBuyerType': string

  'consumer.searchPlaceholder': string
  'consumer.loading': string
  'consumer.forecast': string
  'consumer.todayDemand': string
  'consumer.marketWants': string
  'consumer.commodities': string
  'consumer.freshFromFarm': string
  'consumer.viewAll': string
  'consumer.unitLeft': string
  'consumer.rain': string
  'consumer.humidity': string

  'admin.title': string
  'admin.desc': string
  'admin.view': string
  'admin.totalUsers': string
  'admin.farmers': string
  'admin.buyers': string
  'admin.activeListings': string
  'admin.orders': string
  'admin.completed': string
  'admin.openDisputes': string
  'admin.transactionVolume': string
  'admin.reviews': string
  'admin.aiPredictions': string
  'admin.pendingVerifications': string
  'admin.avgTrustScore': string
  'admin.chart.regTitle': string
  'admin.chart.regSub': string
  'admin.chart.regFarmers': string
  'admin.chart.regBuyers': string
  'admin.chart.ordersTitle': string
  'admin.chart.ordersSub': string
  'admin.chart.orders': string
  'admin.chart.completed': string
  'admin.chart.disputes': string
  'admin.chart.txTitle': string
  'admin.chart.txSub': string
  'admin.chart.volume': string
  'admin.chart.cropTitle': string
  'admin.chart.cropSub': string
  'admin.chart.quantity': string
  'admin.chart.aiTitle': string
  'admin.chart.aiSub': string
  'admin.chart.predictions': string
  'admin.loading': string

  'logistics.title': string
  'logistics.desc': string
  'logistics.liveShipments': string
  'logistics.autoRefresh': string
  'logistics.active': string
  'logistics.noShipments': string
  'logistics.stopOf': string
  'logistics.driver': string
  'logistics.unassignedDriver': string
  'logistics.awaitingTitle': string
  'logistics.awaitingDesc': string
  'logistics.noPending': string
  'logistics.assignTrip': string
  'logistics.driverName': string
  'logistics.vehiclePlaceholder': string
  'logistics.vehicleLabel': string
  'logistics.assign': string
  'logistics.planTrip': string
  'logistics.planDesc': string
  'logistics.pickupPlaceholder': string
  'logistics.pickupLabel': string
  'logistics.pickupKg': string
  'logistics.addStop': string
  'logistics.destination': string
  'logistics.capacity': string
  'logistics.optimizeRoute': string
  'logistics.routeSummary': string
  'logistics.distance': string
  'logistics.eta': string
  'logistics.tripCost': string
  'logistics.utilization': string
  'logistics.bestSequence': string
  'logistics.km': string
  'logistics.hours': string
}

export const en: TranslationDict = {
  'app.brand': 'KrishiLink',
  'app.tagline': 'Farmer Workspace',
  'nav.dashboard': 'Dashboard',
  'nav.myFarm': 'My Farm',
  'nav.farmOverview': 'Farm Overview',
  'nav.production': 'Production',
  'nav.products': 'Products',
  'nav.myProducts': 'My Products',
  'nav.addProduct': 'Add Product',
  'nav.marketplace': 'Marketplace',
  'nav.orders': 'Orders',
  'nav.newOrders': 'New Orders',
  'nav.activeOrders': 'Active Orders',
  'nav.completedOrders': 'Completed Orders',
  'nav.logistics': 'Logistics',
  'nav.activeShipments': 'Active Shipments',
  'nav.trackShipment': 'Track Shipment',
  'nav.aiInsights': 'AI Insights',
  'nav.recommendations': 'Recommendations',
  'nav.notifications': 'Notifications',
  'nav.settings': 'Settings',
  'section.overview': 'Overview',
  'section.sellAndManage': 'Sell & Manage',
  'section.operations': 'Operations',
  'section.account': 'Account',
  'header.search': 'Search',
  'header.searchPlaceholder': 'Search products, orders, shipments…',
  'header.notifications': 'Notifications',
  'header.help': 'Help',
  'header.profileMenu': 'Account menu',
  'header.language': 'Language',
  'header.languageLabel': 'भाषा / ଭାଷା',
  'header.logout': 'Log out',
  'header.myAccount': 'Profile & Settings',
  'dashboard.greetingMorning': 'Good morning',
  'dashboard.greetingAfternoon': 'Good afternoon',
  'dashboard.greetingEvening': 'Good evening',
  'dashboard.subtitle': "Here's what's happening with your farm today.",
  'dashboard.todayStatus': 'Today’s farm status',
  'dashboard.activeCrops': 'Active crops',
  'dashboard.products': 'Products',
  'dashboard.newOrders': 'New orders',
  'dashboard.activeShipments': 'Active shipments',
  'dashboard.revenue': 'Revenue',
  'dashboard.orders': 'Orders',
  'dashboard.trustScore': 'Trust score',
  'dashboard.activeListings': 'Active listings',
  'dashboard.farmOverview': 'Farm overview',
  'dashboard.farmOverviewDesc': 'A snapshot of your fields, crops and production.',
  'dashboard.activeCrops.title': 'Active crops',
  'dashboard.upcomingHarvest': 'Upcoming harvest',
  'dashboard.myCrops': 'My crops',
  'dashboard.growing': 'Growing',
  'dashboard.expectedHarvest': 'Expected harvest',
  'dashboard.aiMarketIntel': 'AI market intelligence',
  'dashboard.aiInsightDemo': 'Insights refresh with the mandi day.',
  'dashboard.demand': 'Demand',
  'dashboard.price': 'Price',
  'dashboard.sellRange': 'Sell range',
  'dashboard.weather': 'Weather',
  'dashboard.farmHealth': 'Farm health',
  'dashboard.marketPrices': 'Market prices',
  'dashboard.liveTracking': 'Live tracking',
  'dashboard.noShipments': 'No active shipments.',
  'dashboard.noCrops': 'No crops added yet.',
  'dashboard.viewAll': 'View all',
  'dashboard.seeForecast': 'View 5-day forecast',
  'common.loading': 'Loading…',
  'common.error': 'Error',
  'common.yes': 'Yes',
  'common.no': 'No',
  'common.close': 'Close',
  'common.search': 'Search',
  'common.kg': 'kg',
  'common.view': 'View',
  'common.add': 'Add',
  'common.status': 'Status',
  'common.crop': 'Crop',

  'navLabel.Dashboard': 'Dashboard',
  'navLabel.AI Insights': 'AI Insights',
  'navLabel.My Farm': 'My Farm',
  'navLabel.Farm Overview': 'Farm Overview',
  'navLabel.Farm Notes': 'Farm Notes',
  'navLabel.Products': 'Products',
  'navLabel.My Products': 'My Products',
  'navLabel.Listings': 'Listings',
  'navLabel.Inventory': 'Inventory',
  'navLabel.Batches': 'Batches',
  'navLabel.Orders': 'Orders',
  'navLabel.Contracts': 'Contracts',
  'navLabel.Logistics': 'Logistics',
  'navLabel.Logistics & Tracking': 'Logistics & Tracking',
  'navLabel.Logistics Tracking': 'Logistics Tracking',
  'navLabel.Logistics Monitor': 'Logistics Monitor',
  'navLabel.Live Map': 'Live Map',
  'navLabel.Live Map Tracking': 'Live Map Tracking',
  'navLabel.Live Order Tracking': 'Live Order Tracking',
  'navLabel.Route Dispatch & Assign': 'Route Dispatch & Assign',
  'navLabel.Dispatch': 'Dispatch',
  'navLabel.AI': 'AI',
  'navLabel.Tracking': 'Tracking',
  'navLabel.Storage Intel': 'Storage Intel',
  'navLabel.Demands': 'Demands',
  'navLabel.Profile': 'Profile',
  'navLabel.Orders & Tracking': 'Orders & Tracking',
  'navLabel.Weather': 'Weather',
  'navLabel.Marketplace': 'Marketplace',
  'navLabel.Profile & Settings': 'Profile & Settings',
  'navLabel.Notifications': 'Notifications',
  'navLabel.Settings': 'Settings',

  'navLabel.Demand Posts': 'Demand Posts',
  'navLabel.AI Recommendations': 'AI Recommendations',
  'navLabel.Browse Listings': 'Browse Listings',
  'navLabel.Onboarding': 'Onboarding',
  'navLabel.Sourcing': 'Sourcing',

  'navLabel.Verifications': 'Verifications',
  'navLabel.Trust Scores': 'Trust Scores',
  'navLabel.Disputes': 'Disputes',
  'navLabel.Browse Records': 'Browse Records',
  'navLabel.Community': 'Community',
  'navLabel.Sell & Manage': 'Sell & Manage',
  'navLabel.Operations': 'Operations',
  'navLabel.Overview': 'Overview',
  'navLabel.Support': 'Support',
  'navLabel.Data': 'Data',
  'navLabel.Account': 'Account',
  'navLabel.Home': 'Home',

  'buyer.title': 'Procurement overview',
  'buyer.subtitle': 'Source verified farm produce, publish demands, and track escrow-backed orders.',
  'buyer.liveProduce': 'Live produce',
  'buyer.liveProduceHint': 'Active verified crop listings',
  'buyer.explore': 'Explore',
  'buyer.aiMatches': 'AI farmer matches',
  'buyer.aiMatchesHint': 'Automated sourcing recommendations',
  'buyer.viewMatches': 'View matches',
  'buyer.activeOrders': 'Active orders',
  'buyer.activeOrdersHint': 'Escrow-backed procurements',
  'buyer.orderCenter': 'Order center',
  'buyer.publishedDemands': 'Published demands',
  'buyer.publishedDemandsHint': 'Open procurement requirements',
  'buyer.manageDemands': 'Manage demands',
  'buyer.payments': 'Payments',
  'buyer.paymentsHint': 'Advance & balance transactions',
  'buyer.deliveries': 'Deliveries',
  'buyer.deliveriesHint': 'Incoming farm shipments',
  'buyer.track': 'Track',
  'buyer.postDemand': '+ Post Crop Demand',
  'buyer.identityVerified': 'Identity verified',
  'buyer.identity': 'Identity',
  'buyer.escrowVerified': 'Escrow payment verified',
  'buyer.escrowPayment': 'Escrow payment',
  'buyer.profileComplete': 'Profile {pct}% complete',
  'buyer.escrowSecured': 'Escrow secured funds',
  'buyer.ordersLink': 'Orders →',
  'buyer.deposited': 'Deposited',
  'buyer.released': 'Released',
  'buyer.escrowAccounts': '{n} escrow account',
  'buyer.escrowAccountsPlural': '{n} escrow accounts',
  'buyer.escrowLinked': 'linked to your orders',
  'buyer.trustScore': 'Buyer trust score',
  'buyer.reviews': '{n} reviews',
  'buyer.trustSubtitle': 'Trust evens out as you complete more verified deliveries with prompt escrow payments.',
  'buyer.trackFooter': 'Track incoming shipments and release escrow from your order center.',
  'buyer.noOrders': 'No orders yet',

  'demand.createTitle': 'Create demand',
  'demand.createDesc': 'Tell farmers what you need and when, so they can match your request.',
  'demand.newDemand': 'New demand',
  'demand.crop': 'Crop',
  'demand.chooseCrop': 'Choose a crop',
  'demand.quantity': 'Quantity ({unit})',
  'demand.targetPrice': 'Target price range (INR)',
  'demand.min': 'Min',
  'demand.max': 'Max',
  'demand.requiredBy': 'Required by',
  'demand.quality': 'Quality requirements',
  'demand.creating': 'Creating…',
  'demand.create': 'Create demand',
  'demand.yourDemands': 'Your demands',
  'demand.noDemands': 'No demands yet — post your first demand above.',
  'demand.filterStatus': 'Filter status:',
  'demand.all': 'All',
  'demand.by': 'by',
  'demand.cancel': 'Cancel',
  'demand.none': 'No demands found.',
  'demand.createdDraft': 'Demand created as a draft.',
  'demand.cancelled': 'Demand cancelled.',

  'rec.title': 'Farmer recommendations',
  'rec.desc': 'Tell us what you need and we rank the farmers most likely to fulfil it — with the reason for every match explained.',
  'rec.lookingFor': 'What are you looking for?',
  'rec.crop': 'Crop',
  'rec.quantityNeeded': 'Quantity needed (kg)',
  'rec.priceRange': 'Target price range (INR/kg)',
  'rec.yourState': 'Your state',
  'rec.yourDistrict': 'Your district',
  'rec.needBy': 'Need it by',
  'rec.quality': 'Quality requirements',
  'rec.finding': 'Finding matches…',
  'rec.find': 'Find matching farmers',
  'rec.clear': 'Clear results',
  'rec.rankingBased': 'Ranking based on: {crop}',
  'rec.selectedCrop': 'selected crop',
  'rec.none': 'No matching farmers found for these requirements. Try widening the location, price range, or delivery date.',
  'rec.match': 'match',
  'rec.why': 'Why we recommend this farmer',
  'rec.trust': 'Trust: {score} ({band})',
  'rec.back': 'Back to dashboard',

  'onboard.title': 'Set up your buying profile',
  'onboard.desc': 'Tell us who you buy for, verify your identity and payment details, and start sourcing produce.',
  'onboard.step.buyerType': 'Buyer Type',
  'onboard.step.basic': 'Basic Information',
  'onboard.step.identity': 'Identity / Business Verification',
  'onboard.step.location': 'Location',
  'onboard.step.payment': 'Payment Verification',
  'onboard.step.trust': 'Trust Status',
  'onboard.chooseDesc': 'Choose what best describes how you buy produce.',
  'onboard.continue': 'Continue',
  'onboard.buyerType': 'Buyer type',
  'onboard.choose': 'Choose',
  'onboard.fullName': 'Full name',
  'onboard.businessName': 'Business name',
  'onboard.saving': 'Saving…',
  'onboard.saveContinue': 'Save and continue',
  'onboard.identityVerify': 'Identity / business verification',
  'onboard.checking': 'Checking…',
  'onboard.submitIdentity': 'Submit for identity verification',
  'onboard.continueLocation': 'Continue to location',
  'onboard.deliverWhere': 'Where should produce be delivered?',
  'onboard.latitude': 'Latitude',
  'onboard.longitude': 'Longitude',
  'onboard.paymentVerify': 'Payment verification',
  'onboard.submitPayment': 'Submit for payment verification',
  'onboard.continueTrust': 'Continue to trust status',
  'onboard.reference': 'Reference: {ref}',
  'onboard.trustStatus': 'Trust status',
  'onboard.trustGrows': 'Your trust score grows as you complete verified orders and reviews.',
  'onboard.identity': 'Identity: {status}',
  'onboard.payment': 'Payment: {status}',
  'onboard.goDashboard': 'Go to dashboard',
  'onboard.createDemand': 'Create a demand',
  'onboard.chooseBuyerType': 'Choose a buyer type before continuing.',

  'consumer.searchPlaceholder': 'Search fresh produce…',
  'consumer.loading': 'Loading…',
  'consumer.forecast': 'Forecast →',
  'consumer.todayDemand': "Today's Buyer Demand",
  'consumer.marketWants': 'What the local market wants today',
  'consumer.commodities': 'Commodities & Food',
  'consumer.freshFromFarm': 'Fresh from Farm',
  'consumer.viewAll': 'View all →',
  'consumer.unitLeft': '{qty} {unit} left',
  'consumer.rain': 'Rain {pct}%',
  'consumer.humidity': '{pct}% humidity',

  'admin.title': 'Administration',
  'admin.desc': 'Live overview of the marketplace — registered players, activity, transactions, disputes, and AI usage.',
  'admin.view': 'view →',
  'admin.totalUsers': 'Total users',
  'admin.farmers': 'Farmers',
  'admin.buyers': 'Buyers',
  'admin.activeListings': 'Active listings',
  'admin.orders': 'Orders',
  'admin.completed': 'Completed',
  'admin.openDisputes': 'Open disputes',
  'admin.transactionVolume': 'Transaction volume',
  'admin.reviews': 'Reviews',
  'admin.aiPredictions': 'AI predictions',
  'admin.pendingVerifications': 'Pending verifications',
  'admin.avgTrustScore': 'Avg trust score',
  'admin.chart.regTitle': 'Registered farmers & buyers',
  'admin.chart.regSub': 'New registrations per day (last 30 days)',
  'admin.chart.regFarmers': 'Farmers',
  'admin.chart.regBuyers': 'Buyers',
  'admin.chart.ordersTitle': 'Orders, completions & disputes',
  'admin.chart.ordersSub': 'Daily marketplace activity',
  'admin.chart.orders': 'Orders',
  'admin.chart.completed': 'Completed',
  'admin.chart.disputes': 'Disputes',
  'admin.chart.txTitle': 'Transaction volume',
  'admin.chart.txSub': 'Paid payment value per day (₹, last 30 days)',
  'admin.chart.volume': 'Volume',
  'admin.chart.cropTitle': 'Crop demand',
  'admin.chart.cropSub': 'Top crops by requested quantity (kg)',
  'admin.chart.quantity': 'Quantity (kg)',
  'admin.chart.aiTitle': 'AI predictions',
  'admin.chart.aiSub': 'Price, demand & matching calls per day',
  'admin.chart.predictions': 'Predictions',
  'admin.loading': 'Loading dashboard…',

  'logistics.title': 'Logistics',
  'logistics.desc': 'Live shipment tracking, trip assignment & route optimizer',
  'logistics.liveShipments': 'Live Shipments',
  'logistics.autoRefresh': 'Auto-refreshes every 15s while a trip is running.',
  'logistics.active': '{n} active',
  'logistics.noShipments': 'No shipments assigned yet. Pick a ready order below to start tracking.',
  'logistics.stopOf': 'Stop {current} of {total}',
  'logistics.driver': 'Driver',
  'logistics.unassignedDriver': 'Unassigned driver',
  'logistics.awaitingTitle': 'Orders Awaiting Trip Assignment',
  'logistics.awaitingDesc': 'Prepared orders that can be picked up by your vehicles.',
  'logistics.noPending': 'No pending orders. New confirmed & prepared orders will appear here.',
  'logistics.assignTrip': 'Assign trip',
  'logistics.driverName': 'Driver name',
  'logistics.vehiclePlaceholder': 'Vehicle (e.g. OD-02-TR-1234)',
  'logistics.vehicleLabel': 'Vehicle registration',
  'logistics.assign': 'Assign',
  'logistics.planTrip': 'Plan a Collection Trip',
  'logistics.planDesc': 'Add farm pickup points, set vehicle capacity, and let the AI optimize your route.',
  'logistics.pickupPlaceholder': 'Pickup location',
  'logistics.pickupLabel': 'Pickup location',
  'logistics.pickupKg': 'Pickup quantity in kilograms',
  'logistics.addStop': '+ Add pickup stop',
  'logistics.destination': 'Destination',
  'logistics.capacity': 'Vehicle capacity (kg)',
  'logistics.optimizeRoute': 'Optimize Route',
  'logistics.routeSummary': 'Route Summary',
  'logistics.distance': 'Distance',
  'logistics.eta': 'ETA',
  'logistics.tripCost': 'Trip cost',
  'logistics.utilization': 'Vehicle utilization: {pct}%',
  'logistics.bestSequence': 'Best Sequence',
  'logistics.km': '{km} km',
  'logistics.hours': '{h} h',
}

export const or: TranslationDict = {
  'app.brand': 'କୃଷି ଲିଙ୍କ',
  'app.tagline': 'କୃଷକ କାର୍ଯ୍ୟକ୍ଷେତ୍ର',
  'nav.dashboard': 'ଡ୍ୟାସବୋର୍ଡ',
  'nav.myFarm': 'ମୋ ଖେତ',
  'nav.farmOverview': 'ଖେତ ସମୀକ୍ଷା',
  'nav.production': 'ଉତ୍ପାଦନ',
  'nav.products': 'ଉତ୍ପାଦ',
  'nav.myProducts': 'ମୋ ଉତ୍ପାଦ',
  'nav.addProduct': 'ଉତ୍ପାଦ ଯୋଡ଼ନ୍ତୁ',
  'nav.marketplace': 'ମାର୍କେଟପ୍ଲେସ',
  'nav.orders': 'ଅର୍ଡର',
  'nav.newOrders': 'ନୂଆ ଅର୍ଡର',
  'nav.activeOrders': 'ସକ୍ରିୟ ଅର୍ଡର',
  'nav.completedOrders': 'ସମ୍ପୂର୍ଣ୍ଣ ଅର୍ଡର',
  'nav.logistics': 'ଲଜିଷ୍ଟିକ୍ସ',
  'nav.activeShipments': 'ସକ୍ରିୟ ଚାଳନ',
  'nav.trackShipment': 'ଚାଳନ ଟ୍ରାକ୍',
  'nav.aiInsights': 'AI ବୁଝାମଣା',
  'nav.recommendations': 'ସୁପାରିଶ',
  'nav.notifications': 'ବିଜ୍ଞପ୍ତି',
  'nav.settings': 'ସେଟିଂସ୍',
  'section.overview': 'ସମୀକ୍ଷା',
  'section.sellAndManage': 'ବିକ୍ରି ଓ ପରିଚାଳନା',
  'section.operations': 'କାର୍ଯ୍ୟ',
  'section.account': 'ଖାତା',
  'header.search': 'ଖୋଜନ୍ତୁ',
  'header.searchPlaceholder': 'ଉତ୍ପାଦ, ଅର୍ଡର, ଚାଳନ ଖୋଜନ୍ତୁ…',
  'header.notifications': 'ବିଜ୍ଞପ୍ତି',
  'header.help': 'ସହାୟତା',
  'header.profileMenu': 'ଖାତା ମେନୁ',
  'header.language': 'ଭାଷା',
  'header.languageLabel': 'ଭାଷା / भाषा',
  'header.logout': 'ଲଗ ଆଉଟ୍',
  'header.myAccount': 'ପ୍ରୋଫାଇଲ ଓ ସେଟିଂସ୍',
  'dashboard.greetingMorning': 'ଶୁଭ ସକାଳ',
  'dashboard.greetingAfternoon': 'ଶୁଭ ଅପରାହ୍ନ',
  'dashboard.greetingEvening': 'ଶୁଭ ସନ୍ଧ୍ୟା',
  'dashboard.subtitle': 'ଆଜି ଆପଣଙ୍କ ଖେତର ଅବସ୍ଥା ଏଠାରେ ଅଛି।',
  'dashboard.todayStatus': 'ଆଜିର ଖେତ ସ୍ଥିତି',
  'dashboard.activeCrops': 'ସକ୍ରିୟ ଫସଲ',
  'dashboard.products': 'ଉତ୍ପାଦ',
  'dashboard.newOrders': 'ନୂଆ ଅର୍ଡର',
  'dashboard.activeShipments': 'ସକ୍ରିୟ ଚାଳନ',
  'dashboard.revenue': 'ରାଜସ୍ୱ',
  'dashboard.orders': 'ଅର୍ଡର',
  'dashboard.trustScore': 'ବିଶ୍ୱାସ ସ୍କୋର',
  'dashboard.activeListings': 'ସକ୍ରିୟ ତାଲିକା',
  'dashboard.farmOverview': 'ଖେତ ସମୀକ୍ଷା',
  'dashboard.farmOverviewDesc': 'ଆପଣଙ୍କ କ୍ଷେତ୍ର, ଫସଲ ଓ ଉତ୍ପାଦନର ସାରାଂଶ।',
  'dashboard.activeCrops.title': 'ସକ୍ରିୟ ଫସଲ',
  'dashboard.upcomingHarvest': 'ଆଗାମୀ ଅମଳ',
  'dashboard.myCrops': 'ମୋ ଫସଲ',
  'dashboard.growing': 'ବଢୁଛି',
  'dashboard.expectedHarvest': 'ଆଶା କରାଯାଉଥିବା ଅମଳ',
  'dashboard.aiMarketIntel': 'AI ବଜାର ବୁଝାମଣା',
  'dashboard.aiInsightDemo': 'ମଣ୍ଡି ଦିନ ସହିତ ବୁଝାମଣା ସତେଜ ହୁଏ।',
  'dashboard.demand': 'ଚାହିଦା',
  'dashboard.price': 'ଦର',
  'dashboard.sellRange': 'ବିକ୍ରି ସୀମା',
  'dashboard.weather': 'ପାଣିପାଗ',
  'dashboard.farmHealth': 'ଖେତ ସ୍ୱାସ୍ଥ୍ୟ',
  'dashboard.marketPrices': 'ବଜାର ଦର',
  'dashboard.liveTracking': 'ଲାଇଭ ଟ୍ରାକିଂ',
  'dashboard.noShipments': 'କୌଣସି ସକ୍ରିୟ ଚାଳନ ନାହିଁ।',
  'dashboard.noCrops': 'ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ଫସଲ ଯୋଡ଼ା ଯାଇନାହିଁ।',
  'dashboard.viewAll': 'ସବୁ ଦେଖନ୍ତୁ',
  'dashboard.seeForecast': '୫ ଦିନର ପୂର୍ବାନୁମାନ ଦେଖନ୍ତୁ',
  'common.loading': 'ଲୋଡ ହେଉଛି…',
  'common.error': 'ତ୍ରୁଟି',
  'common.yes': 'ହଁ',
  'common.no': 'ନାଁ',
  'common.close': 'ବନ୍ଦ',
  'common.search': 'ଖୋଜନ୍ତୁ',
  'common.kg': 'କି.ଗ୍ରା.',
  'common.view': 'ଦେଖନ୍ତୁ',
  'common.add': 'ଯୋଡ଼ନ୍ତୁ',
  'common.status': 'ସ୍ଥିତି',
  'common.crop': 'ଫସଲ',

  'navLabel.Dashboard': 'ଡ୍ୟାସବୋର୍ଡ',
  'navLabel.AI Insights': 'AI ବୁଝାମଣା',
  'navLabel.My Farm': 'ମୋ ଖେତ',
  'navLabel.Farm Overview': 'ଖେତ ସମୀକ୍ଷା',
  'navLabel.Farm Notes': 'ଖେତ ନୋଟ୍',
  'navLabel.Products': 'ଉତ୍ପାଦ',
  'navLabel.My Products': 'ମୋ ଉତ୍ପାଦ',
  'navLabel.Listings': 'ତାଲିକା',
  'navLabel.Inventory': 'ଭଣ୍ଡାର',
  'navLabel.Batches': 'ବ୍ୟାଚ୍',
  'navLabel.Orders': 'ଅର୍ଡର',
  'navLabel.Contracts': 'ଚୁକ୍ତି',
  'navLabel.Logistics': 'ଲଜିଷ୍ଟିକ୍ସ',
  'navLabel.Logistics & Tracking': 'ଯୋଗାଣ ଓ ଟ୍ରାକିଂ',
  'navLabel.Logistics Tracking': 'ଯୋଗାଣ ଟ୍ରାକିଂ',
  'navLabel.Logistics Monitor': 'ଯୋଗାଣ ନିରୀକ୍ଷଣ',
  'navLabel.Live Map': 'ଲାଇଭ ମ୍ୟାପ୍',
  'navLabel.Live Map Tracking': 'ଲାଇଭ ମ୍ୟାପ୍ ଟ୍ରାକିଂ',
  'navLabel.Live Order Tracking': 'ଲାଇଭ ଅର୍ଡର ଟ୍ରାକିଂ',
  'navLabel.Route Dispatch & Assign': 'ରୁଟ୍ ପଠାଣ ଓ କାର୍ଯ୍ୟରତ',
  'navLabel.Dispatch': 'ପଠାଣ',
  'navLabel.AI': 'AI',
  'navLabel.Tracking': 'ଟ୍ରାକିଂ',
  'navLabel.Storage Intel': 'ଭଣ୍ଡାର ବୁଦ୍ଧି',
  'navLabel.Demands': 'ଚାହିଦା',
  'navLabel.Profile': 'ପ୍ରୋଫାଇଲ',
  'navLabel.Orders & Tracking': 'ଅର୍ଡର ଓ ଟ୍ରାକିଂ',
  'navLabel.Weather': 'ପାଣିପାଗ',
  'navLabel.Marketplace': 'ମାର୍କେଟପ୍ଲେସ',
  'navLabel.Profile & Settings': 'ପ୍ରୋଫାଇଲ ଓ ସେଟିଂସ୍',
  'navLabel.Notifications': 'ବିଜ୍ଞପ୍ତି',
  'navLabel.Settings': 'ସେଟିଂସ୍',

  'navLabel.Demand Posts': 'ଚାହିଦା ପୋଷ୍ଟ',
  'navLabel.AI Recommendations': 'AI ସୁପାରିଶ',
  'navLabel.Browse Listings': 'ଲିଷ୍ଟିଂ ବ୍ରାଉଜ କରନ୍ତୁ',
  'navLabel.Onboarding': 'ଅନବୋର୍ଡିଂ',
  'navLabel.Sourcing': 'ସୋର୍ସିଂ',

  'navLabel.Verifications': 'ଯାଞ୍ଚ',
  'navLabel.Trust Scores': 'ଟ୍ରଷ୍ଟ ସ୍କୋର',
  'navLabel.Disputes': 'ବିବାଦ',
  'navLabel.Browse Records': 'ରେକର୍ଡ ବ୍ରାଉଜ କରନ୍ତୁ',
  'navLabel.Community': 'ସମୁଦାୟ',
  'navLabel.Sell & Manage': 'ବିକ୍ରି ଓ ପରିଚାଳନା',
  'navLabel.Operations': 'କାର୍ଯ୍ୟାବଳୀ',
  'navLabel.Overview': 'ସମୀକ୍ଷା',
  'navLabel.Support': 'ସହାୟତା',
  'navLabel.Data': 'ଡାଟା',
  'navLabel.Account': 'ଆକାଉଣ୍ଟ',
  'navLabel.Home': 'ହୋମ୍',

  'buyer.title': 'କ୍ରୟ ସମୀକ୍ଷା',
  'buyer.subtitle': 'ଯାଞ୍ଚିତ ଫାର୍ମ ଉତ୍ପାଦ ସୋର୍ସ କରନ୍ତୁ, ଚାହିଦା ପ୍ରକାଶ କରନ୍ତୁ, ଏବଂ ଏସ୍କ୍ରୋ-ସମର୍ଥିତ ଅର୍ଡର ଟ୍ରାକ୍ କରନ୍ତୁ।',
  'buyer.liveProduce': 'ଲାଇଭ୍ ଉତ୍ପାଦ',
  'buyer.liveProduceHint': 'ସକ୍ରିୟ ଯାଞ୍ଚିତ ଫସଲ ଲିଷ୍ଟିଂ',
  'buyer.explore': 'ଅନୁସନ୍ଧାନ',
  'buyer.aiMatches': 'AI କୃଷକ ମେଳ',
  'buyer.aiMatchesHint': 'ସ୍ୱୟଂଚାଳିତ ସୋର୍ସିଂ ସୁପାରିଶ',
  'buyer.viewMatches': 'ମେଳ ଦେଖନ୍ତୁ',
  'buyer.activeOrders': 'ସକ୍ରିୟ ଅର୍ଡର',
  'buyer.activeOrdersHint': 'ଏସ୍କ୍ରୋ-ସମର୍ଥିତ କ୍ରୟ',
  'buyer.orderCenter': 'ଅର୍ଡର ସେଣ୍ଟର',
  'buyer.publishedDemands': 'ପ୍ରକାଶିତ ଚାହିଦା',
  'buyer.publishedDemandsHint': 'ଖୋଲା କ୍ରୟ ଆବଶ୍ୟକତା',
  'buyer.manageDemands': 'ଚାହିଦା ପରିଚାଳନା',
  'buyer.payments': 'ଦେୟ',
  'buyer.paymentsHint': 'ଅଗ୍ରୀମ ଓ ବାକି ଲେନଦେନ',
  'buyer.deliveries': 'ଡେଲିଭରି',
  'buyer.deliveriesHint': 'ଆଗାମୀ ଫାର୍ମ ଚାଳନ',
  'buyer.track': 'ଟ୍ରାକ୍',
  'buyer.postDemand': '+ ଫସଲ ଚାହିଦା ପୋଷ୍ଟ କରନ୍ତୁ',
  'buyer.identityVerified': 'ପରିଚୟ ଯାଞ୍ଚିତ',
  'buyer.identity': 'ପରିଚୟ',
  'buyer.escrowVerified': 'ଏସ୍କ୍ରୋ ଦେୟ ଯାଞ୍ଚିତ',
  'buyer.escrowPayment': 'ଏସ୍କ୍ରୋ ଦେୟ',
  'buyer.profileComplete': 'ପ୍ରୋଫାଇଲ {pct}% ସମ୍ପୂର୍ଣ୍ଣ',
  'buyer.escrowSecured': 'ଏସ୍କ୍ରୋ ସୁରକ୍ଷିତ ପାଣ୍ଠି',
  'buyer.ordersLink': 'ଅର୍ଡର →',
  'buyer.deposited': 'ଜମା',
  'buyer.released': 'ମୁକ୍ତ',
  'buyer.escrowAccounts': '{n} ଏସ୍କ୍ରୋ ଆକାଉଣ୍ଟ',
  'buyer.escrowAccountsPlural': '{n} ଏସ୍କ୍ରୋ ଆକାଉଣ୍ଟ',
  'buyer.escrowLinked': 'ଆପଣଙ୍କ ଅର୍ଡର ସହ ସଂଯୁକ୍ତ',
  'buyer.trustScore': 'କ୍ରେତା ଟ୍ରଷ୍ଟ ସ୍କୋର',
  'buyer.reviews': '{n} ସମୀକ୍ଷା',
  'buyer.trustSubtitle': 'ସମୟାନୁସାରେ ଏସ୍କ୍ରୋ ଦେୟ ସହ ଅଧିକ ଯାଞ୍ଚିତ ଡେଲିଭରି ସମ୍ପୂର୍ଣ୍ଣ କରିବା ଦ୍ୱାରା ଟ୍ରଷ୍ଟ ବୃଦ୍ଧି ହୁଏ।',
  'buyer.trackFooter': 'ଅର୍ଡର ସେଣ୍ଟରରୁ ଆଗାମୀ ଚାଳନ ଟ୍ରାକ୍ କରନ୍ତୁ ଏବଂ ଏସ୍କ୍ରୋ ମୁକ୍ତ କରନ୍ତୁ।',
  'buyer.noOrders': 'ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ଅର୍ଡର ନାହିଁ',

  'demand.createTitle': 'ଚାହିଦା ସୃଷ୍ଟି କରନ୍ତୁ',
  'demand.createDesc': 'ଆପଣଙ୍କୁ କ\'ଣ ଓ କେବେ ଦରକାର ତାହା କୃଷକଙ୍କୁ କୁହନ୍ତୁ, ଯାହା ଦ୍ୱାରା ସେମାନେ ଆପଣଙ୍କ ଅନୁରୋଧ ସହ ମେଳ କରିପାରିବେ।',
  'demand.newDemand': 'ନୂଆ ଚାହିଦା',
  'demand.crop': 'ଫସଲ',
  'demand.chooseCrop': 'ଏକ ଫସଲ ବାଛନ୍ତୁ',
  'demand.quantity': 'ପରିମାଣ ({unit})',
  'demand.targetPrice': 'ଟାର୍ଗେଟ୍ ମୂଲ୍ୟ ସୀମା (INR)',
  'demand.min': 'ସର୍ବନିମ୍ନ',
  'demand.max': 'ସର୍ବାଧିକ',
  'demand.requiredBy': 'ଆବଶ୍ୟକ ତାରିଖ',
  'demand.quality': 'ଗୁଣବତ୍ତା ଆବଶ୍ୟକତା',
  'demand.creating': 'ସୃଷ୍ଟି ହେଉଛି…',
  'demand.create': 'ଚାହିଦା ସୃଷ୍ଟି କରନ୍ତୁ',
  'demand.yourDemands': 'ଆପଣଙ୍କ ଚାହିଦା',
  'demand.noDemands': 'ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ଚାହିଦା ନାହିଁ — ଉପରେ ଆପଣଙ୍କର ପ୍ରଥମ ଚାହିଦା ପୋଷ୍ଟ କରନ୍ତୁ।',
  'demand.filterStatus': 'ସ୍ଥିତି ଫିଲ୍ଟର:',
  'demand.all': 'ସବୁ',
  'demand.by': 'ଦ୍ୱାରା',
  'demand.cancel': 'ବାତିଲ',
  'demand.none': 'କୌଣସି ଚାହିଦା ମିଳିଲା ନାହିଁ।',
  'demand.createdDraft': 'ଚାହିଦା ଡ୍ରାଫ୍ଟ ଭାବରେ ସୃଷ୍ଟି ହେଲା।',
  'demand.cancelled': 'ଚାହିଦା ବାତିଲ ହେଲା।',

  'rec.title': 'କୃଷକ ସୁପାରିଶ',
  'rec.desc': 'ଆପଣଙ୍କୁ କ\'ଣ ଦରକାର ତାହା କୁହନ୍ତୁ, ଆମେ ଏହାକୁ ପୂରଣ କରିବାର ସମ୍ଭାବନା ଅଧିକ ଥିବା କୃଷକମାନଙ୍କୁ ର‍୍ୟାଙ୍କ କରୁ — ପ୍ରତ୍ୟେକ ମେଳର କାରଣ ବୁଝାଇ ଦିଆଯାଏ।',
  'rec.lookingFor': 'ଆପଣ କ\'ଣ ଖୋଜୁଛନ୍ତି?',
  'rec.crop': 'ଫସଲ',
  'rec.quantityNeeded': 'ଆବଶ୍ୟକ ପରିମାଣ (କି.ଗ୍ରା.)',
  'rec.priceRange': 'ଟାର୍ଗେଟ୍ ମୂଲ୍ୟ ସୀମା (INR/କି.ଗ୍ରା.)',
  'rec.yourState': 'ଆପଣଙ୍କ ରାଜ୍ୟ',
  'rec.yourDistrict': 'ଆପଣଙ୍କ ଜିଲ୍ଲା',
  'rec.needBy': 'କେବେ ଦରକାର',
  'rec.quality': 'ଗୁଣବତ୍ତା ଆବଶ୍ୟକତା',
  'rec.finding': 'ମେଳ ଖୋଜୁଛି…',
  'rec.find': 'ମେଳ ଖାଉଥିବା କୃଷକ ଖୋଜନ୍ତୁ',
  'rec.clear': 'ଫଳାଫଳ ସଫା କରନ୍ତୁ',
  'rec.rankingBased': 'ର‍୍ୟାଙ୍କିଂ ଆଧାର: {crop}',
  'rec.selectedCrop': 'ଚୟନିତ ଫସଲ',
  'rec.none': 'ଏହି ଆବଶ୍ୟକତା ପାଇଁ କୌଣସି ମେଳ ଖାଉଥିବା କୃଷକ ମିଳିଲା ନାହିଁ। ସ୍ଥାନ, ମୂଲ୍ୟ ସୀମା କିମ୍ବା ଡେଲିଭରି ତାରିଖ ବଢ଼ାଇବାକୁ ଚେଷ୍ଟା କରନ୍ତୁ।',
  'rec.match': 'ମେଳ',
  'rec.why': 'ଆମେ ଏହି କୃଷକଙ୍କୁ କାହିଁକି ସୁପାରିଶ କରୁ',
  'rec.trust': 'ଟ୍ରଷ୍ଟ: {score} ({band})',
  'rec.back': 'ଡ୍ୟାସବୋର୍ଡକୁ ଫେରନ୍ତୁ',

  'onboard.title': 'ଆପଣଙ୍କ କ୍ରୟ ପ୍ରୋଫାଇଲ ସେଟ୍ ଅପ୍ କରନ୍ତୁ',
  'onboard.desc': 'ଆପଣ କାହା ପାଇଁ କିଣନ୍ତି, ପରିଚୟ ଓ ଦେୟ ବିବରଣୀ ଯାଞ୍ଚ କରନ୍ତୁ, ଏବଂ ଉତ୍ପାଦ ସୋର୍ସ କରିବା ଆରମ୍ଭ କରନ୍ତୁ।',
  'onboard.step.buyerType': 'କ୍ରେତା ପ୍ରକାର',
  'onboard.step.basic': 'ମୌଳିକ ସୂଚନା',
  'onboard.step.identity': 'ପରିଚୟ / ବ୍ୟବସାୟ ଯାଞ୍ଚ',
  'onboard.step.location': 'ଅବସ୍ଥାନ',
  'onboard.step.payment': 'ଦେୟ ଯାଞ୍ଚ',
  'onboard.step.trust': 'ଟ୍ରଷ୍ଟ ସ୍ଥିତି',
  'onboard.chooseDesc': 'ଆପଣ କିପରି ଉତ୍ପାଦ କିଣନ୍ତି ତାହା ସର୍ବୋତ୍ତମ ଭାବରେ ବର୍ଣ୍ଣନା କରୁଥିବା ବିକଳ୍ପ ବାଛନ୍ତୁ।',
  'onboard.continue': 'ଜାରି ରଖନ୍ତୁ',
  'onboard.buyerType': 'କ୍ରେତା ପ୍ରକାର',
  'onboard.choose': 'ବାଛନ୍ତୁ',
  'onboard.fullName': 'ପୂର୍ଣ୍ଣ ନାମ',
  'onboard.businessName': 'ବ୍ୟବସାୟ ନାମ',
  'onboard.saving': 'ସେଭ୍ ହେଉଛି…',
  'onboard.saveContinue': 'ସେଭ୍ ଓ ଜାରି ରଖନ୍ତୁ',
  'onboard.identityVerify': 'ପରିଚୟ / ବ୍ୟବସାୟ ଯାଞ୍ଚ',
  'onboard.checking': 'ଯାଞ୍ଚ ହେଉଛି…',
  'onboard.submitIdentity': 'ପରିଚୟ ଯାଞ୍ଚ ପାଇଁ ଦାଖଲ କରନ୍ତୁ',
  'onboard.continueLocation': 'ଅବସ୍ଥାନକୁ ଜାରି ରଖନ୍ତୁ',
  'onboard.deliverWhere': 'ଉତ୍ପାଦ କେଉଁଠାରେ ପହଞ୍ଚାଯାଉ?',
  'onboard.latitude': 'ଅକ୍ଷାଂଶ',
  'onboard.longitude': 'ଦ୍ରାଘିମା',
  'onboard.paymentVerify': 'ଦେୟ ଯାଞ୍ଚ',
  'onboard.submitPayment': 'ଦେୟ ଯାଞ୍ଚ ପାଇଁ ଦାଖଲ କରନ୍ତୁ',
  'onboard.continueTrust': 'ଟ୍ରଷ୍ଟ ସ୍ଥିତିକୁ ଜାରି ରଖନ୍ତୁ',
  'onboard.reference': 'ରେଫରେନ୍ସ: {ref}',
  'onboard.trustStatus': 'ଟ୍ରଷ୍ଟ ସ୍ଥିତି',
  'onboard.trustGrows': 'ଆପଣ ଯାଞ୍ଚିତ ଅର୍ଡର ଓ ସମୀକ୍ଷା ସମ୍ପୂର୍ଣ୍ଣ କରିବା ସହ ଆପଣଙ୍କ ଟ୍ରଷ୍ଟ ସ୍କୋର ବଢ଼ିଥାଏ।',
  'onboard.identity': 'ପରିଚୟ: {status}',
  'onboard.payment': 'ଦେୟ: {status}',
  'onboard.goDashboard': 'ଡ୍ୟାସବୋର୍ଡକୁ ଯାଆନ୍ତୁ',
  'onboard.createDemand': 'ଏକ ଚାହିଦା ସୃଷ୍ଟି କରନ୍ତୁ',
  'onboard.chooseBuyerType': 'ଜାରି ରଖିବା ପୂର୍ବରୁ ଏକ କ୍ରେତା ପ୍ରକାର ବାଛନ୍ତୁ।',

  'consumer.searchPlaceholder': 'ତାଜା ଉତ୍ପାଦ ଖୋଜନ୍ତୁ…',
  'consumer.loading': 'ଲୋଡ୍ ହେଉଛି…',
  'consumer.forecast': 'ପୂର୍ବାନୁମାନ →',
  'consumer.todayDemand': 'ଆଜିର କ୍ରେତା ଚାହିଦା',
  'consumer.marketWants': 'ସ୍ଥାନୀୟ ବଜାର ଆଜି କ\'ଣ ଚାହୁଁଛି',
  'consumer.commodities': 'କମୋଡିଟି ଓ ଖାଦ୍ୟ',
  'consumer.freshFromFarm': 'ଫାର୍ମରୁ ତାଜା',
  'consumer.viewAll': 'ସବୁ ଦେଖନ୍ତୁ →',
  'consumer.unitLeft': '{qty} {unit} ଅଛି',
  'consumer.rain': 'ବର୍ଷା {pct}%',
  'consumer.humidity': '{pct}% ଆର୍ଦ୍ରତା',

  'admin.title': 'ପ୍ରଶାସନ',
  'admin.desc': 'ମାର୍କେଟପ୍ଲେସର ଲାଇଭ୍ ସମୀକ୍ଷା — ପଞ୍ଜୀକୃତ ସଦସ୍ୟ, କାର୍ଯ୍ୟକଳାପ, ଲେନଦେନ, ବିବାଦ, ଓ AI ବ୍ୟବହାର।',
  'admin.view': 'ଦେଖନ୍ତୁ →',
  'admin.totalUsers': 'ମୋଟ ଉପଭୋକ୍ତା',
  'admin.farmers': 'କୃଷକ',
  'admin.buyers': 'କ୍ରେତା',
  'admin.activeListings': 'ସକ୍ରିୟ ଲିଷ୍ଟିଂ',
  'admin.orders': 'ଅର୍ଡର',
  'admin.completed': 'ସମ୍ପୂର୍ଣ୍ଣ',
  'admin.openDisputes': 'ଖୋଲା ବିବାଦ',
  'admin.transactionVolume': 'ଲେନଦେନ ପରିମାଣ',
  'admin.reviews': 'ସମୀକ୍ଷା',
  'admin.aiPredictions': 'AI ପୂର୍ବାନୁମାନ',
  'admin.pendingVerifications': 'ବାକି ଯାଞ୍ଚ',
  'admin.avgTrustScore': 'ହାରାହାରି ଟ୍ରଷ୍ଟ ସ୍କୋର',
  'admin.chart.regTitle': 'ପଞ୍ଜୀକୃତ କୃଷକ ଓ କ୍ରେତା',
  'admin.chart.regSub': 'ପ୍ରତିଦିନ ନୂଆ ପଞ୍ଜୀକରଣ (ଶେଷ 30 ଦିନ)',
  'admin.chart.regFarmers': 'କୃଷକ',
  'admin.chart.regBuyers': 'କ୍ରେତା',
  'admin.chart.ordersTitle': 'ଅର୍ଡର, ସମାପ୍ତି ଓ ବିବାଦ',
  'admin.chart.ordersSub': 'ଦୈନିକ ମାର୍କେଟପ୍ଲେସ କାର୍ଯ୍ୟକଳାପ',
  'admin.chart.orders': 'ଅର୍ଡର',
  'admin.chart.completed': 'ସମ୍ପୂର୍ଣ୍ଣ',
  'admin.chart.disputes': 'ବିବାଦ',
  'admin.chart.txTitle': 'ଲେନଦେନ ପରିମାଣ',
  'admin.chart.txSub': 'ପ୍ରତିଦିନ ଦେୟ ମୂଲ୍ୟ (₹, ଶେଷ 30 ଦିନ)',
  'admin.chart.volume': 'ପରିମାଣ',
  'admin.chart.cropTitle': 'ଫସଲ ଚାହିଦା',
  'admin.chart.cropSub': 'ରିକ୍ୱେଷ୍ଟ ହୋଇଥିବା ପରିମାଣ (କି.ଗ୍ରା.) ଅନୁଯାୟୀ ଶୀର୍ଷ ଫସଲ',
  'admin.chart.quantity': 'ପରିମାଣ (କି.ଗ୍ରା.)',
  'admin.chart.aiTitle': 'AI ପୂର୍ବାନୁମାନ',
  'admin.chart.aiSub': 'ପ୍ରତିଦିନ ମୂଲ୍ୟ, ଚାହିଦା ଓ ମେଳିଂ କଲ',
  'admin.chart.predictions': 'ପୂର୍ବାନୁମାନ',
  'admin.loading': 'ଡ୍ୟାସବୋର୍ଡ ଲୋଡ୍ ହେଉଛି…',

  'logistics.title': 'ଲଜିଷ୍ଟିକ୍ସ',
  'logistics.desc': 'ଲାଇଭ୍ ଚାଳନ ଟ୍ରାକିଂ, ଟ୍ରିପ୍ ନ୍ୟସ୍ତ ଓ ରୁଟ୍ ଅପ୍ଟିମାଇଜର',
  'logistics.liveShipments': 'ଲାଇଭ୍ ଚାଳନ',
  'logistics.autoRefresh': 'ଟ୍ରିପ୍ ଚାଲୁଥିବା ସମୟରେ ପ୍ରତି 15 ସେକେଣ୍ଡରେ ଅଟୋ-ରିଫ୍ରେଶ ହୁଏ।',
  'logistics.active': '{n} ସକ୍ରିୟ',
  'logistics.noShipments': 'ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ଚାଳନ ନ୍ୟସ୍ତ ହୋଇନାହିଁ। ଟ୍ରାକିଂ ଆରମ୍ଭ କରିବାକୁ ତଳେ ଏକ ପ୍ରସ୍ତୁତ ଅର୍ଡର ବାଛନ୍ତୁ।',
  'logistics.stopOf': 'ଷ୍ଟପ୍ {current} / {total}',
  'logistics.driver': 'ଡ୍ରାଇଭର',
  'logistics.unassignedDriver': 'ନ୍ୟସ୍ତ ହୋଇନଥିବା ଡ୍ରାଇଭର',
  'logistics.awaitingTitle': 'ଟ୍ରିପ୍ ନ୍ୟସ୍ତ ପାଇଁ ଅପେକ୍ଷାରେ ଥିବା ଅର୍ଡର',
  'logistics.awaitingDesc': 'ପ୍ରସ୍ତୁତ ଅର୍ଡର ଯାହା ଆପଣଙ୍କ ଯାନ ଦ୍ୱାରା ଉଠାଯାଇପାରିବ।',
  'logistics.noPending': 'କୌଣସି ବାକି ଅର୍ଡର ନାହିଁ। ନୂଆ ନିଶ୍ଚିତ ଓ ପ୍ରସ୍ତୁତ ଅର୍ଡର ଏଠାରେ ଦେଖାଯିବ।',
  'logistics.assignTrip': 'ଟ୍ରିପ୍ ନ୍ୟସ୍ତ କରନ୍ତୁ',
  'logistics.driverName': 'ଡ୍ରାଇଭର ନାମ',
  'logistics.vehiclePlaceholder': 'ଯାନ (ଉଦା: OD-02-TR-1234)',
  'logistics.vehicleLabel': 'ଯାନ ରେଜିଷ୍ଟ୍ରେସନ୍',
  'logistics.assign': 'ନ୍ୟସ୍ତ କରନ୍ତୁ',
  'logistics.planTrip': 'ଏକ ସଂଗ୍ରହ ଟ୍ରିପ୍ ଯୋଜନା କରନ୍ତୁ',
  'logistics.planDesc': 'ଫାର୍ମ ପିକ୍ ଆପ୍ ପଏଣ୍ଟ ଯୋଡ଼ନ୍ତୁ, ଯାନ କ୍ଷମତା ସ୍ଥିର କରନ୍ତୁ, ଏବଂ AI କୁ ଆପଣଙ୍କ ରୁଟ୍ ଅପ୍ଟିମାଇଜ କରିବାକୁ ଦିଅନ୍ତୁ।',
  'logistics.pickupPlaceholder': 'ପିକ୍ ଆପ୍ ସ୍ଥାନ',
  'logistics.pickupLabel': 'ପିକ୍ ଆପ୍ ସ୍ଥାନ',
  'logistics.pickupKg': 'କିଲୋଗ୍ରାମରେ ପିକ୍ ଆପ୍ ପରିମାଣ',
  'logistics.addStop': '+ ପିକ୍ ଆପ୍ ଷ୍ଟପ୍ ଯୋଡ଼ନ୍ତୁ',
  'logistics.destination': 'ଗନ୍ତବ୍ୟ',
  'logistics.capacity': 'ଯାନ କ୍ଷମତା (କି.ଗ୍ରା.)',
  'logistics.optimizeRoute': 'ରୁଟ୍ ଅପ୍ଟିମାଇଜ୍ କରନ୍ତୁ',
  'logistics.routeSummary': 'ରୁଟ୍ ସାରାଂଶ',
  'logistics.distance': 'ଦୂରତା',
  'logistics.eta': 'ETA',
  'logistics.tripCost': 'ଟ୍ରିପ୍ ଖର୍ଚ୍ଚ',
  'logistics.utilization': 'ଯାନ ବ୍ୟବହାର: {pct}%',
  'logistics.bestSequence': 'ସର୍ବୋତ୍ତମ କ୍ରମ',
  'logistics.km': '{km} କି.ମି.',
  'logistics.hours': '{h} ଘଣ୍ଟା',
}

export const hi: TranslationDict = {
  'app.brand': 'कृषि लिंक',
  'app.tagline': 'किसान कार्यक्षेत्र',
  'nav.dashboard': 'डैशबोर्ड',
  'nav.myFarm': 'मेरा खेत',
  'nav.farmOverview': 'खेत अवलोकन',
  'nav.production': 'उत्पादन',
  'nav.products': 'उत्पाद',
  'nav.myProducts': 'मेरे उत्पाद',
  'nav.addProduct': 'उत्पाद जोड़ें',
  'nav.marketplace': 'मार्केटप्लेस',
  'nav.orders': 'ऑर्डर',
  'nav.newOrders': 'नए ऑर्डर',
  'nav.activeOrders': 'सक्रिय ऑर्डर',
  'nav.completedOrders': 'पूर्ण ऑर्डर',
  'nav.logistics': 'लॉजिस्टिक्स',
  'nav.activeShipments': 'सक्रिय शिपमेंट',
  'nav.trackShipment': 'शिपमेंट ट्रैक करें',
  'nav.aiInsights': 'AI अंतर्दृष्टि',
  'nav.recommendations': 'सिफारिशें',
  'nav.notifications': 'सूचनाएँ',
  'nav.settings': 'सेटिंग्स',
  'section.overview': 'अवलोकन',
  'section.sellAndManage': 'बेचें और प्रबंधित करें',
  'section.operations': 'संचालन',
  'section.account': 'खाता',
  'header.search': 'खोजें',
  'header.searchPlaceholder': 'उत्पाद, ऑर्डर, शिपमेंट खोजें…',
  'header.notifications': 'सूचनाएँ',
  'header.help': 'सहायता',
  'header.profileMenu': 'खाता मेनू',
  'header.language': 'भाषा',
  'header.languageLabel': 'भाषा / ଭାଷା',
  'header.logout': 'लॉग आउट',
  'header.myAccount': 'प्रोफ़ाइल और सेटिंग्स',
  'dashboard.greetingMorning': 'सुप्रभात',
  'dashboard.greetingAfternoon': 'नमस्ते',
  'dashboard.greetingEvening': 'शुभ संध्या',
  'dashboard.subtitle': 'आज आपके खेत की स्थिति यहाँ है।',
  'dashboard.todayStatus': 'आज का खेत स्थिति',
  'dashboard.activeCrops': 'सक्रिय फसलें',
  'dashboard.products': 'उत्पाद',
  'dashboard.newOrders': 'नए ऑर्डर',
  'dashboard.activeShipments': 'सक्रिय शिपमेंट',
  'dashboard.revenue': 'राजस्व',
  'dashboard.orders': 'ऑर्डर',
  'dashboard.trustScore': 'विश्वास स्कोर',
  'dashboard.activeListings': 'सक्रिय लिस्टिंग',
  'dashboard.farmOverview': 'खेत अवलोकन',
  'dashboard.farmOverviewDesc': 'आपके खेतों, फसलों और उत्पादन का सारांश।',
  'dashboard.activeCrops.title': 'सक्रिय फसलें',
  'dashboard.upcomingHarvest': 'आगामी फसल',
  'dashboard.myCrops': 'मेरी फसलें',
  'dashboard.growing': 'बढ़ रहा है',
  'dashboard.expectedHarvest': 'अपेक्षित फसल',
  'dashboard.aiMarketIntel': 'AI बाजार अंतर्दृष्टि',
  'dashboard.aiInsightDemo': 'मंडी दिन के साथ अंतर्दृष्टि ताज़ा होती है।',
  'dashboard.demand': 'मांग',
  'dashboard.price': 'मूल्य',
  'dashboard.sellRange': 'बिक्री सीमा',
  'dashboard.weather': 'मौसम',
  'dashboard.farmHealth': 'खेत स्वास्थ्य',
  'dashboard.marketPrices': 'बाजार मूल्य',
  'dashboard.liveTracking': 'लाइव ट्रैकिंग',
  'dashboard.noShipments': 'कोई सक्रिय शिपमेंट नहीं।',
  'dashboard.noCrops': 'अभी तक कोई फसल नहीं जोड़ी गई।',
  'dashboard.viewAll': 'सभी देखें',
  'dashboard.seeForecast': '5 दिन का पूर्वानुमान देखें',
  'common.loading': 'लोड हो रहा है…',
  'common.error': 'त्रुटि',
  'common.yes': 'हाँ',
  'common.no': 'नहीं',
  'common.close': 'बंद करें',
  'common.search': 'खोजें',
  'common.kg': 'किलो',
  'common.view': 'देखें',
  'common.add': 'जोड़ें',
  'common.status': 'स्थिति',
  'common.crop': 'फसल',

  'navLabel.Dashboard': 'डैशबोर्ड',
  'navLabel.AI Insights': 'AI अंतर्दृष्टि',
  'navLabel.My Farm': 'मेरा खेत',
  'navLabel.Farm Overview': 'खेत अवलोकन',
  'navLabel.Farm Notes': 'खेत नोट',
  'navLabel.Products': 'उत्पाद',
  'navLabel.My Products': 'मेरे उत्पाद',
  'navLabel.Listings': 'लिस्टिंग',
  'navLabel.Inventory': 'इन्वेंट्री',
  'navLabel.Batches': 'बैच',
  'navLabel.Orders': 'ऑर्डर',
  'navLabel.Contracts': 'अनुबंध',
  'navLabel.Logistics': 'लॉजिस्टिक्स',
  'navLabel.Logistics & Tracking': 'लॉजिस्टिक्स और ट्रैकिंग',
  'navLabel.Logistics Tracking': 'लॉजिस्टिक्स ट्रैकिंग',
  'navLabel.Logistics Monitor': 'लॉजिस्टिक्स मॉनिटर',
  'navLabel.Live Map': 'लाइव मैप',
  'navLabel.Live Map Tracking': 'लाइव मैप ट्रैकिंग',
  'navLabel.Live Order Tracking': 'लाइव ऑर्डर ट्रैकिंग',
  'navLabel.Route Dispatch & Assign': 'रूट प्रेषण और असाइनमेंट',
  'navLabel.Dispatch': 'प्रेषण',
  'navLabel.AI': 'AI',
  'navLabel.Tracking': 'ट्रैकिंग',
  'navLabel.Storage Intel': 'भंडारण इंटेल',
  'navLabel.Demands': 'मांग',
  'navLabel.Profile': 'प्रोफ़ाइल',
  'navLabel.Orders & Tracking': 'ऑर्डर और ट्रैकिंग',
  'navLabel.Weather': 'मौसम',
  'navLabel.Marketplace': 'मार्केटप्लेस',
  'navLabel.Profile & Settings': 'प्रोफ़ाइल और सेटिंग्स',
  'navLabel.Notifications': 'सूचनाएँ',
  'navLabel.Settings': 'सेटिंग्स',

  'navLabel.Demand Posts': 'मांग पोस्ट',
  'navLabel.AI Recommendations': 'AI सिफारिशें',
  'navLabel.Browse Listings': 'सूची ब्राउज़ करें',
  'navLabel.Onboarding': 'ऑनबोर्डिंग',
  'navLabel.Sourcing': 'सोर्सिंग',

  'navLabel.Verifications': 'सत्यापन',
  'navLabel.Trust Scores': 'ट्रस्ट स्कोर',
  'navLabel.Disputes': 'विवाद',
  'navLabel.Browse Records': 'रिकॉर्ड ब्राउज़ करें',
  'navLabel.Community': 'समुदाय',
  'navLabel.Sell & Manage': 'बेचें और प्रबंधित करें',
  'navLabel.Operations': 'संचालन',
  'navLabel.Overview': 'अवलोकन',
  'navLabel.Support': 'सहायता',
  'navLabel.Data': 'डेटा',
  'navLabel.Account': 'खाता',
  'navLabel.Home': 'होम',

  'buyer.title': 'सोर्सिंग अवलोकन',
  'buyer.subtitle': 'सत्यापित उपज सोर्स करें, मांग प्रकाशित करें, और एस्क्रो-समर्थित ऑर्डर ट्रैक करें।',
  'buyer.liveProduce': 'लाइव उपज',
  'buyer.liveProduceHint': 'सक्रिय सत्यापित फसल सूची',
  'buyer.explore': 'खोजें',
  'buyer.aiMatches': 'AI किसान मेल',
  'buyer.aiMatchesHint': 'स्वचालित सोर्सिंग सिफारिशें',
  'buyer.viewMatches': 'मेल देखें',
  'buyer.activeOrders': 'सक्रिय ऑर्डर',
  'buyer.activeOrdersHint': 'एस्क्रो-समर्थित खरीद',
  'buyer.orderCenter': 'ऑर्डर केंद्र',
  'buyer.publishedDemands': 'प्रकाशित मांगें',
  'buyer.publishedDemandsHint': 'खुली खरीद आवश्यकताएँ',
  'buyer.manageDemands': 'मांगें प्रबंधित करें',
  'buyer.payments': 'भुगतान',
  'buyer.paymentsHint': 'अग्रिम एवं शेष लेनदेन',
  'buyer.deliveries': 'डिलीवरी',
  'buyer.deliveriesHint': 'आगामी फार्म शिपमेंट',
  'buyer.track': 'ट्रैक',
  'buyer.postDemand': '+ फसल मांग पोस्ट करें',
  'buyer.identityVerified': 'पहचान सत्यापित',
  'buyer.identity': 'पहचान',
  'buyer.escrowVerified': 'एस्क्रो भुगतान सत्यापित',
  'buyer.escrowPayment': 'एस्क्रो भुगतान',
  'buyer.profileComplete': 'प्रोफ़ाइल {pct}% पूर्ण',
  'buyer.escrowSecured': 'एस्क्रो सुरक्षित धनराशि',
  'buyer.ordersLink': 'ऑर्डर →',
  'buyer.deposited': 'जमा',
  'buyer.released': 'रिलीज़',
  'buyer.escrowAccounts': '{n} एस्क्रो खाता',
  'buyer.escrowAccountsPlural': '{n} एस्क्रो खाते',
  'buyer.escrowLinked': 'आपके ऑर्डर से जुड़े',
  'buyer.trustScore': 'क्रेता ट्रस्ट स्कोर',
  'buyer.reviews': '{n} समीक्षाएँ',
  'buyer.trustSubtitle': 'समय पर एस्क्रो भुगतान के साथ अधिक सत्यापित डिलीवरी पूरी करने से ट्रस्ट बढ़ता है।',
  'buyer.trackFooter': 'अपने ऑर्डर केंद्र से आगामी शिपमेंट ट्रैक करें और एस्क्रो रिलीज़ करें।',
  'buyer.noOrders': 'अभी कोई ऑर्डर नहीं',

  'demand.createTitle': 'मांग बनाएं',
  'demand.createDesc': 'किसानों को बताएं कि आपको क्या और कब चाहिए, ताकि वे आपके अनुरोध से मेल कर सकें।',
  'demand.newDemand': 'नई मांग',
  'demand.crop': 'फसल',
  'demand.chooseCrop': 'फसल चुनें',
  'demand.quantity': 'मात्रा ({unit})',
  'demand.targetPrice': 'लक्ष्य मूल्य सीमा (INR)',
  'demand.min': 'न्यूनतम',
  'demand.max': 'अधिकतम',
  'demand.requiredBy': 'आवश्यक तिथि',
  'demand.quality': 'गुणवत्ता आवश्यकताएँ',
  'demand.creating': 'बन रहा है…',
  'demand.create': 'मांग बनाएं',
  'demand.yourDemands': 'आपकी मांगें',
  'demand.noDemands': 'अभी कोई मांग नहीं — ऊपर अपनी पहली मांग पोस्ट करें।',
  'demand.filterStatus': 'स्थिति फ़िल्टर:',
  'demand.all': 'सभी',
  'demand.by': 'द्वारा',
  'demand.cancel': 'रद्द करें',
  'demand.none': 'कोई मांग नहीं मिली।',
  'demand.createdDraft': 'मांग ड्राफ़्ट के रूप में बनाई गई।',
  'demand.cancelled': 'मांग रद्द कर दी गई।',

  'rec.title': 'किसान सिफारिशें',
  'rec.desc': 'हमें बताएं कि आपको क्या चाहिए और हम उन किसानों को रैंक करते हैं जिनके पूरा होने की संभावना सबसे अधिक है — हर मेल का कारण समझाते हुए।',
  'rec.lookingFor': 'आप क्या खोज रहे हैं?',
  'rec.crop': 'फसल',
  'rec.quantityNeeded': 'आवश्यक मात्रा (किग्रा)',
  'rec.priceRange': 'लक्ष्य मूल्य सीमा (INR/किग्रा)',
  'rec.yourState': 'आपका राज्य',
  'rec.yourDistrict': 'आपका जिला',
  'rec.needBy': 'कब तक चाहिए',
  'rec.quality': 'गुणवत्ता आवश्यकताएँ',
  'rec.finding': 'मेल खोज रहा है…',
  'rec.find': 'मेल खाते किसान खोजें',
  'rec.clear': 'परिणाम साफ़ करें',
  'rec.rankingBased': 'रैंकिंग आधार: {crop}',
  'rec.selectedCrop': 'चयनित फसल',
  'rec.none': 'इन आवश्यकताओं के लिए कोई मेल खाता किसान नहीं मिला। स्थान, मूल्य सीमा, या डिलीवरी तिथि बढ़ाने का प्रयास करें।',
  'rec.match': 'मेल',
  'rec.why': 'हम इस किसान की सिफारिश क्यों करते हैं',
  'rec.trust': 'ट्रस्ट: {score} ({band})',
  'rec.back': 'डैशबोर्ड पर वापस',

  'onboard.title': 'अपनी खरीद प्रोफ़ाइल सेट करें',
  'onboard.desc': 'हमें बताएं कि आप किसके लिए खरीदते हैं, अपनी पहचान और भुगतान विवरण सत्यापित करें, और उपज सोर्स करना शुरू करें।',
  'onboard.step.buyerType': 'क्रेता प्रकार',
  'onboard.step.basic': 'मूल जानकारी',
  'onboard.step.identity': 'पहचान / व्यवसाय सत्यापन',
  'onboard.step.location': 'स्थान',
  'onboard.step.payment': 'भुगतान सत्यापन',
  'onboard.step.trust': 'ट्रस्ट स्थिति',
  'onboard.chooseDesc': 'चुनें कि आप उपज कैसे खरीदते हैं, इसका सबसे अच्छा वर्णन कौन सा विकल्प करता है।',
  'onboard.continue': 'जारी रखें',
  'onboard.buyerType': 'क्रेता प्रकार',
  'onboard.choose': 'चुनें',
  'onboard.fullName': 'पूरा नाम',
  'onboard.businessName': 'व्यवसाय का नाम',
  'onboard.saving': 'सहेजा जा रहा है…',
  'onboard.saveContinue': 'सहेजें और जारी रखें',
  'onboard.identityVerify': 'पहचान / व्यवसाय सत्यापन',
  'onboard.checking': 'जाँच हो रही है…',
  'onboard.submitIdentity': 'पहचान सत्यापन के लिए जमा करें',
  'onboard.continueLocation': 'स्थान पर जारी रखें',
  'onboard.deliverWhere': 'उपज कहाँ पहुँचाई जानी चाहिए?',
  'onboard.latitude': 'अक्षांश',
  'onboard.longitude': 'देशांतर',
  'onboard.paymentVerify': 'भुगतान सत्यापन',
  'onboard.submitPayment': 'भुगतान सत्यापन के लिए जमा करें',
  'onboard.continueTrust': 'ट्रस्ट स्थिति पर जारी रखें',
  'onboard.reference': 'संदर्भ: {ref}',
  'onboard.trustStatus': 'ट्रस्ट स्थिति',
  'onboard.trustGrows': 'सत्यापित ऑर्डर और समीक्षाएँ पूरी करने पर आपका ट्रस्ट स्कोर बढ़ता है।',
  'onboard.identity': 'पहचान: {status}',
  'onboard.payment': 'भुगतान: {status}',
  'onboard.goDashboard': 'डैशबोर्ड पर जाएं',
  'onboard.createDemand': 'मांग बनाएं',
  'onboard.chooseBuyerType': 'जारी रखने से पहले एक क्रेता प्रकार चुनें।',

  'consumer.searchPlaceholder': 'ताज़ी उपज खोजें…',
  'consumer.loading': 'लोड हो रहा है…',
  'consumer.forecast': 'पूर्वानुमान →',
  'consumer.todayDemand': 'आज की क्रेता मांग',
  'consumer.marketWants': 'आज स्थानीय बाज़ार को क्या चाहिए',
  'consumer.commodities': 'कमोडिटी और भोजन',
  'consumer.freshFromFarm': 'फार्म से ताज़ा',
  'consumer.viewAll': 'सभी देखें →',
  'consumer.unitLeft': '{qty} {unit} शेष',
  'consumer.rain': 'वर्षा {pct}%',
  'consumer.humidity': '{pct}% आर्द्रता',

  'admin.title': 'प्रशासन',
  'admin.desc': 'मार्केटप्लेस का लाइव अवलोकन — पंजीकृत सदस्य, गतिविधि, लेनदेन, विवाद और AI उपयोग।',
  'admin.view': 'देखें →',
  'admin.totalUsers': 'कुल उपयोगकर्ता',
  'admin.farmers': 'किसान',
  'admin.buyers': 'क्रेता',
  'admin.activeListings': 'सक्रिय सूचियाँ',
  'admin.orders': 'ऑर्डर',
  'admin.completed': 'पूर्ण',
  'admin.openDisputes': 'खुले विवाद',
  'admin.transactionVolume': 'लेनदेन मात्रा',
  'admin.reviews': 'समीक्षाएँ',
  'admin.aiPredictions': 'AI पूर्वानुमान',
  'admin.pendingVerifications': 'लंबित सत्यापन',
  'admin.avgTrustScore': 'औसत ट्रस्ट स्कोर',
  'admin.chart.regTitle': 'पंजीकृत किसान और क्रेता',
  'admin.chart.regSub': 'प्रति दिन नए पंजीकरण (पिछले 30 दिन)',
  'admin.chart.regFarmers': 'किसान',
  'admin.chart.regBuyers': 'क्रेता',
  'admin.chart.ordersTitle': 'ऑर्डर, पूर्णता और विवाद',
  'admin.chart.ordersSub': 'दैनिक मार्केटप्लेस गतिविधि',
  'admin.chart.orders': 'ऑर्डर',
  'admin.chart.completed': 'पूर्ण',
  'admin.chart.disputes': 'विवाद',
  'admin.chart.txTitle': 'लेनदेन मात्रा',
  'admin.chart.txSub': 'प्रति दिन भुगतान मूल्य (₹, पिछले 30 दिन)',
  'admin.chart.volume': 'मात्रा',
  'admin.chart.cropTitle': 'फसल मांग',
  'admin.chart.cropSub': 'अनुरोधित मात्रा (किग्रा) द्वारा शीर्ष फसलें',
  'admin.chart.quantity': 'मात्रा (किग्रा)',
  'admin.chart.aiTitle': 'AI पूर्वानुमान',
  'admin.chart.aiSub': 'प्रति दिन मूल्य, मांग और मेल कॉल',
  'admin.chart.predictions': 'पूर्वानुमान',
  'admin.loading': 'डैशबोर्ड लोड हो रहा है…',

  'logistics.title': 'लॉजिस्टिक्स',
  'logistics.desc': 'लाइव शिपमेंट ट्रैकिंग, ट्रिप असाइनमेंट और रूट ऑप्टिमाइज़र',
  'logistics.liveShipments': 'लाइव शिपमेंट',
  'logistics.autoRefresh': 'ट्रिप चलने के दौरान हर 15 सेकंड में स्वतः रीफ़्रेश होता है।',
  'logistics.active': '{n} सक्रिय',
  'logistics.noShipments': 'अभी कोई शिपमेंट असाइन नहीं हुआ है। ट्रैकिंग शुरू करने के लिए नीचे एक तैयार ऑर्डर चुनें।',
  'logistics.stopOf': 'स्टॉप {current} / {total}',
  'logistics.driver': 'ड्राइवर',
  'logistics.unassignedDriver': 'असाइन नहीं किया गया ड्राइवर',
  'logistics.awaitingTitle': 'ट्रिप असाइनमेंट की प्रतीक्षा में ऑर्डर',
  'logistics.awaitingDesc': 'तैयार ऑर्डर जिन्हें आपके वाहन उठा सकते हैं।',
  'logistics.noPending': 'कोई लंबित ऑर्डर नहीं। नए पुष्टि और तैयार ऑर्डर यहाँ दिखेंगे।',
  'logistics.assignTrip': 'ट्रिप असाइन करें',
  'logistics.driverName': 'ड्राइवर का नाम',
  'logistics.vehiclePlaceholder': 'वाहन (जैसे OD-02-TR-1234)',
  'logistics.vehicleLabel': 'वाहन पंजीकरण',
  'logistics.assign': 'असाइन करें',
  'logistics.planTrip': 'संग्रह ट्रिप की योजना बनाएं',
  'logistics.planDesc': 'फार्म पिकअप बिंदु जोड़ें, वाहन क्षमता निर्धारित करें, और AI को अपना रूट ऑप्टिमाइज़ करने दें।',
  'logistics.pickupPlaceholder': 'पिकअप स्थान',
  'logistics.pickupLabel': 'पिकअप स्थान',
  'logistics.pickupKg': 'किलोग्राम में पिकअप मात्रा',
  'logistics.addStop': '+ पिकअप स्टॉप जोड़ें',
  'logistics.destination': 'गंतव्य',
  'logistics.capacity': 'वाहन क्षमता (किग्रा)',
  'logistics.optimizeRoute': 'रूट ऑप्टिमाइज़ करें',
  'logistics.routeSummary': 'रूट सारांश',
  'logistics.distance': 'दूरी',
  'logistics.eta': 'ETA',
  'logistics.tripCost': 'ट्रिप लागत',
  'logistics.utilization': 'वाहन उपयोग: {pct}%',
  'logistics.bestSequence': 'सर्वोत्तम क्रम',
  'logistics.km': '{km} किमी',
  'logistics.hours': '{h} घंटे',
}

export const translations: Record<Language, TranslationDict> = { en, or, hi }
