<?php

// database/seeders/FaqSeeder.php

namespace Database\Seeders;

use App\Models\Faq;
use Illuminate\Database\Seeder;

class FaqSeeder extends Seeder
{
    public function run(): void
    {
        $faqs = [
            ['Who can send?', 'Anyone. Shops and online sellers use us every day, and you can also send a single parcel to family or a friend.'],
            ['What can I send?', 'Anything we can seal and carry safely. General parcels go up to 50 kg, and larger appliances are on the price list. We do not carry cash, fresh food, live animals, alcohol, fuel, gas cylinders, weapons, illegal drugs or anything else that is illegal or dangerous to move. If you are not sure, ask us on WhatsApp first.'],
            ['How long does it take?', 'It depends on the route. We text the recipient the moment the parcel is ready to collect, and you can follow every scan with your tracking number.'],
            ['How do I get my parcel to you?', 'Three ways. Bring it to our CBD point at Stanbank House: free. Ask us to pick it up from your CBD shop: also free. In a Nairobi satellite town, bring it to our drop-off agent at Kahawa West, Kikuyu, Kitengela, Ruai, Ruiru or Thika: from KSh 100 on top of the delivery price. Big items such as fridges cost more to collect, and you see the price before you pay.'],
            ['What are the pickup rules?', "CBD shops only. Parcels a rider can carry, up to 10 kg each. Have them packed and ready, because the rider waits up to 5 minutes. As soon as you book you see the rider's name and a handover code."],
            ['Can my customer pay for delivery?', "Yes. When you book, enter the M-PESA number that should pay. It can be yours or your customer's. That number gets the payment prompt, and the parcel leaves once it is paid."],
            ['How do I know the person taking my parcel is from Pick&Send?', 'As soon as you book, the website shows the one person allowed to take your parcel: the rider for a shop pickup, or the agent at the counter for a drop-off, with their name, staff ID and a handover code. Hand over only to that person and only with that code. We never change the person by phone call or text.'],
            ['Can I book on WhatsApp?', 'Yes. Send your request to 0718 819 413 or drop it in our WhatsApp group, and we book it for you. Our WhatsApp channel is for updates only.'],
            ['Do you deliver to the door?', 'Not yet. The recipient collects at our pickup station in their town, using the code we send by SMS.'],
            ['I live outside Nairobi. Can you pick something for me?', 'Yes. Tell us what to pick and where, and we collect it in Nairobi and send it to your town at the normal picked-up price. You can set it daily, weekly or monthly.'],
            ['How do points work?', 'You earn 2 points for every KSh 100 you spend on delivery. Each point is KSh 1 off a later parcel, and you can use them once you have 100.'],
            ['How do I get my Cash on Delivery money?', 'Your customer pays our M-PESA Till before collecting. The amount, less 1.6%, lands in your merchant wallet straight away. Withdraw it to M-PESA whenever you like.'],
            ['What if the recipient does not collect?', 'We remind them by SMS. After 7 days the parcel returns to you and a return fee applies.'],
        ];

        foreach ($faqs as $i => [$q, $a]) {
            Faq::updateOrCreate(
                ['question' => $q],
                ['answer' => $a, 'sort_order' => $i, 'is_published' => true]
            );
        }
    }
}
