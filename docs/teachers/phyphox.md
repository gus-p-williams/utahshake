# Phones with an app: phyphox

[phyphox](https://phyphox.org/) is a free phone app from RWTH Aachen University, in Germany,
that turns a phone's sensors into a lab instrument. For an after-school club or a student
research project, it is the best way to record vibrations with phones. The classroom
activities on this site stay in the browser, with nothing to install.

!!! abstract "In short"
    - **phyphox is the better instrument.** It reads the phone's motion sensor directly:
      about 100 readings a second on iPhones, 100 to 500 on Android phones, with no rounding.
      A web page gets at most 60 a second, and Chrome rounds each one to 0.1 m/s².
    - **Our pages use the browser only so that students can use the site without installing
      anything.** That is why the browser is the default here, not because it measures better.
    - **For clubs and research,** install phyphox: it is free and needs no account. If you have
      a set of old classroom phones, installing it on them is a good idea.
    - **The rules still apply.** Phones in class need the district's policy, even phones
      without a SIM card. Clubs after the last bell are the easy case.

## Why phyphox is the better instrument { #better }

A web page reads the motion sensor through the browser, and browsers limit what pages get on
purpose: every browser delivers at most about 60 readings a second, and Chrome rounds each
reading to 0.1 m/s², about 1% of gravity, so that websites can't recognize a phone by its
sensor's quirks. An app reads the sensor directly.

| | A web page (in a browser) | phyphox (an app) |
| --- | --- | --- |
| Readings per second | at most 60 | iPhone and iPad: about 100. Android: 100 to 500; three in four models read about 200 a second or more, and about 400 is the most common |
| Step size | Chrome: 0.1 m/s², set by the browser. Safari on iPhones doesn't round today | the sensor's own step: 0.01 m/s² or finer on most Android phones, by their makers' figures |
| What hides a small shake | the step, in Chrome | the sensor's own noise: about 0.01 to 0.06 m/s² at rest |
| Fastest wiggle it can follow | 30 Hz | at most half its rate: about 50 Hz on iPhones, 100 Hz or more on most Android phones |
| Install | none | the app, once per phone |
| Account | none | none |
| Where the data go | nowhere, unless you download them | nowhere, unless you export them |

**What varies by phone.** The rate, the step, the noise and the biggest shaking the sensor can
measure (about ±8 g on most Android phones) all depend on the model. On Android 12 and later,
a phone whose microphone is switched off in the quick settings gets at most 200 readings a
second, even in phyphox. Apple doesn't publish its sensors' step. To see a phone's rate, use the ready-made
experiment below: it shows **Readings per second**.

**Still not a seismometer.** Without the rounding, the sensor's own noise sets the smallest
shake a phone can see, and at 10 Hz it is still thousands of times bigger than the smallest
shake the school's Raspberry Shake can see. A phone with phyphox feels a stomp, a dropped book or a door
closing nearby; it won't record distant earthquakes. Comparing the two is a good club project.
See [How small a shake can it see?](../theory/seismograms.md#how-small-a-shake) on Reading a
seismogram.

## Why our pages use the browser anyway { #why-browser }

Every app on this site runs in a browser so that students can use it with nothing to install,
on school Chromebooks and managed laptops as well as phones, with no accounts. That is the only
reason our phone pages (so far, the [Phone Bench](../apps/phone-bench.md) test page) read the
sensor through the browser. It makes the site easy to use; it doesn't make it a better
instrument. Where installing an app is fine, use phyphox.

## Old classroom phones: install phyphox { #old-phones }

If you have a set of old phones for the classroom, installing phyphox on them is a good idea.
Each phone becomes a better sensor than any web page can make it.

- **Old phones work.** phyphox needs iOS 12 or later on iPhones and iPads, and Android 5.0 or
  later.
- **Installing needs the phone's app store account.** The App Store needs an Apple Account and
  Google Play a Google account on the phone, even for a free app; phyphox itself asks for
  none. On school-managed phones, the school's IT may install it for you.
- **Number the phones** ("Phone 3"), and label files and results by phone or group, never by a
  student's name.
- **They are still cellphones under the law,** even without a SIM card (see
  [The rules still apply](#rules)).

## Install phyphox { #install }

phyphox is free, with no ads and no in-app purchases. It needs no account and no sign-in. Both
stores list it as collecting no data, and its recordings stay on the phone unless you export
them.

**iPhone or iPad**

1. Open the **App Store** and search for **phyphox**, or open
   [phyphox on the App Store](https://apps.apple.com/us/app/phyphox/id1127319693) on the phone.
   The developer is RWTH Aachen University.
2. Tap **Get**, then confirm with Face ID, Touch ID or the Apple Account password.
3. Open phyphox. There is nothing to sign in to.

**Android phone or tablet**

1. Open **Google Play** and search for **phyphox**, or open
   [phyphox on Google Play](https://play.google.com/store/apps/details?id=de.rwth_aachen.phyphox)
   on the phone. The developer is RWTH Aachen University.
2. Tap **Install**.
3. Open phyphox. There is nothing to sign in to.

A phone with no Google account can get phyphox from
[F-Droid](https://f-droid.org/packages/de.rwth_aachen.phyphox/), a free app store for
open-source apps that needs no account (install F-Droid first, from its website).

## Record a vibration { #record }

### Our ready-made experiment { #experiment }

**UHSN vibration recorder** reads the motion sensor, gravity included, as fast as the phone
allows, draws x, y and z against time, shows the phone's readings per second, and exports a
spreadsheet file with time, x, y and z.

On a phone with phyphox, open this page and tap:

[Open in phyphox](phyphox://gus-p-williams.github.io/utahshake/teachers/files/uhsn-vibration.phyphox){ .md-button .md-button--primary }
[Get phyphox](#install){ .md-button }

- An iPhone first asks whether to open phyphox; tap **Open**. phyphox downloads the experiment
  (the phone needs the internet for this).
- phyphox then asks whether to add it to your experiment collection. Tap **Save to
  collection**: it then sits under **UHSN** in phyphox's list and works without the internet.
- On a phone without phyphox, the button does nothing, or the browser says it can't open the
  address. Install phyphox first, then tap it again.

phyphox's own **Acceleration with g** experiment, under **Raw Sensors**, records the same
sensor and works just as well; ours adds the readings-per-second display and shorter column
names.

### Take a recording { #take }

1. **Lay the phone flat on a solid table or floor, screen up,** and open the experiment.
2. **Tap ▶ at the top right** to start, and take your hands off the phone. To start without
   touching it, use **Timed run** in the menu (the three dots at the top right): you choose a
   start delay and how long to record.
3. **Make the vibration:** a stomp a step away, a book dropped on the table, a door closing.
4. **Tap ⏸** to stop. The trash can clears the recording for the next take.

The z graph shows gravity, about 9.8 m/s², with the vibration on top of it.

## From phyphox to a spreadsheet { #spreadsheet }

1. In the experiment, open the menu (the three dots) and choose **Export Data**.
2. Choose **CSV (Comma, decimal point)**.
3. Send or save the file. On an iPhone, the share sheet opens: save it to Files, or send it to
   a computer. On Android, choose **Share** or **Download** (it lands in Downloads).
4. The file is a **ZIP**. Unzip it (on a computer, or in the Files app) to get
   **Acceleration.csv**: one row per reading, with **Time (s)** and **x**, **y** and **z** in
   m/s². The folder **meta** inside holds the phone's model and the start and stop times.
5. Open **Acceleration.csv** in Google Sheets or Excel and plot it.

phyphox also offers **Excel** in step 2, which gives one .xlsx file and needs no unzipping.

The apps on this site don't open phyphox files; a spreadsheet is the way in.

## Can this site tell whether phyphox is installed? { #detect }

No. A web page can't see which apps are on a phone: browsers block that on purpose, for
privacy, so that a website can't learn about you from your apps. (Chrome on Android has one
narrow exception: a site may ask about its own app, if that app names the site. phyphox names
no website, and Safari has nothing of the kind.)

So we put two buttons side by side: **Open in phyphox** for phones that have it, and
**Get phyphox** for phones that don't. If Open does nothing, the phone doesn't have phyphox
yet.

## The rules still apply { #rules }

- **Phones in class need the district's policy.** Utah's phone law (Utah Code 53G-7-227, made
  bell to bell by SB 69 in 2026) keeps students from using cellphones at school from the first
  bell to the last, lunch and passing time included. The law counts any handheld device that
  can send or receive data wirelessly as a cellphone, so an old phone with no SIM card, on
  Wi-Fi, still counts. Only the district (or charter school) can allow other uses, in its
  policy; a school or a teacher can't.
- **Clubs after the last bell are the easy case.** The law covers school hours. A district may
  extend its limits to school-supervised activities after hours, so check its policy once.
- **No student has to use their own phone.** Under the State Board's device rule (R277-495), a
  student can't be required to use a personal device for coursework. A set of school phones
  avoids the question.
- **The district approves the app.** Since 2026, each district must approve an instructional
  technology before its schools use it in class (Utah Code 53G-7-228). DRI and the schools are
  handling that with the districts; ask before using phyphox in a class.
- **Privacy.** phyphox has no accounts and keeps its recordings on the phone. Label phones and
  files by number or group, never by a student's name, as everywhere on this site.
- **Leave Remote access off at school.** phyphox can show a running experiment in a browser on
  the same Wi-Fi network. phyphox itself warns to use it only on a trusted network, and many
  school networks block it.

Wasatch Academy, a private school, sets its own policy: ask the school.

For developers: the experiment file is
[uhsn-vibration.phyphox](files/uhsn-vibration.phyphox), in phyphox's file format.
