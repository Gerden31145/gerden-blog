<template>
  <div class="text-text-primary">
    <section class="font-serif">
      <div class="aspect-7/2" aria-hidden="true">
       <LiquidLogo />
      </div>
      <!-- <h1 class="text-5xl tracking-tight">Welcome to Gerden Blog!</h1> -->
       <h1 class="sr-only">Gerden Blog</h1>
      <p class="text-4xl font-bold  wrap-break-word">
        Welcome! I record my ramblings and ideas about programming, technology, and art.
      </p>
    </section>

    <section class="mt-12 font-serif">
      <p class="text-sm uppercase tracking-[0.18em] text-primary">About me</p>
      <h2 class="mt-3 text-4xl tracking-tight font-bold mb-5">Hi, I'm Gerden.</h2>
      <div class="w-42 h-52 bg-text-primary float-right overflow-hidden rounded-tr-lg">
        <img src="../assets/img/蓝调校园志愿者微笑肖像.png">
      </div>
      <p class="mt-5 text-2xl leading-8">
        I am a student at GDUFS and a front-end developer currently learning full-stack development.
        I mainly work with <strong>Vue</strong>, <strong>TypeScript</strong>, 
        <strong>Node.js</strong>
         and I’m gradually exploring backend architecture and deployment 
         using tools like <strong>Hono</strong> (which powers this blog) and <strong>NestJS</strong>.
         I am also a <strong>Vim</strong> user.
      </p>
      <p class="mt-4 text-2xl leading-8">
        This blog is where I record what I learn while building real projects
         — from front-end interfaces and backend APIs to deployment. 
         I’m also exploring best practices for vibe coding and AI-assisted learning.
      </p>
      <h2 class="text-4xl tracking-tight font-bold mb-3 mt-8">Outside of coding</h2>
      <div class="card h-52 w-full relative">
        <div class="clipping img8" data-show-index="0">
          <img src="../assets/img/cutting/8.png">
        </div>
        <div class="clipping img9" data-show-index="1">
          <img src="../assets/img/cutting/9.png">
        </div>
        <div class="clipping img10">
          <img src="../assets/img/cutting/10.png">
        </div>
        <div class="clipping img11">
          <img src="../assets/img/cutting/11.png">
        </div>
        <div class="clipping img12">
          <img src="../assets/img/cutting/12.png">
        </div>
        <div class="clipping img15">
          <img src="../assets/img/cutting/15.png">
        </div>
        <div class="clipping img2" style="width: 195px">
          <img src="../assets/img/cutting/2.png">
        </div>
        <div class="clipping img1">
          <img src="../assets/img/cutting/1.png">
        </div>
        <div class="clipping img4">
          <img src="../assets/img/cutting/4.png">
        </div>
        <div class="clipping img5" style="width: 260px">
          <img src="../assets/img/cutting/5.png">
        </div>
        <div class="clipping img7" style="width: 210px">
          <img src="../assets/img/cutting/7.png">
        </div>
        <div class="clipping img3">
          <img src="../assets/img/cutting/3.png">
        </div>
        <div class="clipping img13">
          <img src="../assets/img/cutting/13.png">
        </div>
        <div class="clipping img14">
          <img src="../assets/img/cutting/14.png">
        </div>
      </div>
      <p class="mt-4 text-2xl leading-8">
        I’m really into music. My taste ranges from math rock, indie rock and shoegaze to different styles of jazz.
        Music is woven into my daily life. I play electric guitar, and I'm in a band.
      </p>
      <p class="mt-4 text-2xl leading-8">
        I also enjoy graphic design and making motion graphics. I guess that's part of why I love front-end development.
      </p>
      <p class="text-sm uppercase tracking-[0.18em] text-primary mt-8">Contact me</p>
      <a
        href="https://github.com/Gerden31145"
        target="_blank"
        rel="noreferrer"
        class="mt-3 inline-block text-xl font-bold text-text-primary hover:underline hover:text-primary"
      >
        GitHub / Gerden31145
      </a>
      <div class="mt-3 text-xl font-bold text-text-primary mb-5">Email / 327566107@qq.com</div>
      <footer class="mt-8 text-md mb-8 text-text-primary font-serif w-full text-center">Copyright © 2026 Gerden. All rights reserved.</footer>
    </section>
  </div>
</template>

<script lang="ts" setup>
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'

let lenis : Lenis | null = null
useSeoMeta({
  title:'Gerden Blog - Welcome',
  description:"Gerden's personal blog about frontend development, programming, technology and AI-assisted learning."
})

let cardIntersectionObserver : IntersectionObserver | null = null
let card : HTMLDivElement | null = null

onMounted(() => {
  const clippings = document.querySelectorAll<HTMLDivElement>(".card .clipping")
  const imgs = document.querySelectorAll<HTMLImageElement>(".card .clipping img")

  lenis = new Lenis({
    autoRaf:true,
    lerp:0.07
  })

  cardIntersectionObserver = new IntersectionObserver((entries) => {
    const baseGap = 200
    for (const entry of entries) {
      if (entry.isIntersecting) {
        clippings.forEach((clipping, index) => {
          setTimeout(() => {
            clipping.style.opacity = '1'
          }, baseGap+index*120)
          setTimeout(() => {
            clipping.style.border = 'none'
          }, baseGap+index*160)
        })
        imgs.forEach((img, index) => {
          setTimeout(() => {
            img.style.opacity = '1'
          }, baseGap+index*150)
        })
      }
    }
  })

  card = document.querySelector('.card')
  if (!card) throw new Error("卡片加载失败")
  cardIntersectionObserver.observe(card)
})

onUnmounted(() => {
  cardIntersectionObserver?.disconnect()
  cardIntersectionObserver = null
  lenis?.destroy()
  lenis = null
})
</script>

<style>
.card {
  position: relative;
  overflow: hidden;
  background:
  linear-gradient( #24303f, #8ca5c5);
  isolation: isolate;
}

.card::after {
  content: "";
  position: absolute;
  inset:0;
  pointer-events: none;
  background-image: url("/textures/noise.svg");
  background-size: 80px 80px;
  background-repeat: repeat;
  /* background: #ffffff; */
  opacity: 0.4;
  mix-blend-mode: overlay;
}

.card .clipping {
  position: absolute;
  width: 150px;
  opacity: 0;
  border: #d9f0ff 1px solid;
}

.card .clipping img {
  display: block;
  width: 100%;
  height: auto;
  opacity: 0;
}

/* .card .clipping::after {
  content:"";
  position: absolute;
  inset: 0;
  pointer-events: none;
} */

.img1 {
  transform: translate(70px, 30px);
}

.img2 {
  transform: translate(-30px,30px);
}

.img3 {
  transform: translate(480px, 30px);
}

.img4 {
  transform: translate(360px, 90px);
}

.img5 {
  transform: translate(490px, 60px);
}

.img6 {
  transform: translate(500px);
}

.img7 {
  transform: translate(500px);
}

.img8 {
  transform: translate(140px) rotate(-10deg)
}

.img9 {
  transform: translate(220px);
}

.img10 {
  transform: translate(290px, 10px) scale(0.9) scaleX(0.7) rotate(10deg)
}

.img11 {
  transform: translate(360px) rotate(-10deg);
}

.img12 {
  transform: translate(240px, 100px) scale(0.7)
}

.img13 {
  transform: translate(80px, 110px) scale(0.6) rotate(16deg)
}

.img14 {
  transform: translate(140px, 95px) scale(0.7) rotate(-5deg) scaleX(0.7)
}

.img15 {
  transform: translate(190px, 100px)scale(0.5)
}

.img16 {
  transform: translate(300px);
}
</style>
