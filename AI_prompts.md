# AI Prompts Log — HW4

Every prompt typed by Rachel Fogg, in chronological order, organized by
assignment problem. Within each problem, prompts appear in the order they
were typed, with follow-ups nested under the problem they belong to. Prompts
not yet tied to a specific problem number live under **Setup**.

---

## Problem 1: Vibe Coder Prompts

**Prompt 1**

> Please lets work in homework 4. Here is the context: we are building a real customer website with a chatbot. we will build a rect + vite type script front end and a python fastAPI backend who uses pydanticAI agent. I want shoppers to be able to browse products, create an account, use the chatbot to discuss merch and see matching items appear on the site  and get honest answers about price and stock from a local database.
>
> i've included a data zip and folder within hw4 for us to work with. It includes;
> data/campus_customs.db with catalogue, inventory, and users
> data/products/ for product images and paths that match the catalogue table

**Prompt 2**

> noo

**Prompt 3**

> i dont want you to do anything yet

**Prompt 4**

> please create a AI_prompts.md to log all the prompts I type into this. Also please make sure its broken by my promblems I mentioned. For example this prompt should go into Problem 1: Vibe coder prompts. The AI prompt log should be in chronological order

**Prompt 5**

> prompts 1 - 4 should be under "Problem 1: vibe coder prompts"

---

## Problem 2: Analyze the Database

**Prompt 1**

> Okay we are now working on Problem 2: Analyze the database.
>
> please look at the database included within data/campus_customs.db and understand each of the fields of each data, especially the catalogue, inventory, and users
>
> Please create a output/harness.md file and write down each of the tables and its fields. please include one short line for each field explaining why each field matters for the shop , our chatbot, generally to operate this shop

---

## Problem 3: Build the Campus Customs Website

**Prompt 1**

> Thank you! Now we are working in Problem 3: Build the campus customs website.
>
> The frontend of the website will require a scaffold of a react + vite + typescript for campus customs. put a navigation bar at the top that includes a link to the main pages:
> Home
> Products
> About US
> Log in
> Create an Account
>
> please pull in Campus customs-style lanaguage and wording from yalebulldogblue.com and the Home and About US pages. Please we will write the pages in our own voice, I do not want to copy the language directly from the website.
>
> On the product page, please show the product images from the catalogue (use the image paths in the database). Include the basic product info like name price, an a short product description
>
> Make sure each product can open to a single-item page (large imagine on the left side and full product text on the right side which will include the product description, price, size/stock). Clicking a card on products should take the shopper directly here.
>
> Add a chat interface in the bottom right of the site (a floating chat panel is good). it does not need to talk to an agent yet. A sub to call your backend later is enough for now. We will need a small API soon to read the database. It is fine to start with a simple FastAPI app in backend/main.py just to serve products and images - we will make it into an agent in Problem 5

**Prompt 2**

> why doesnt the frontend link work?

**Prompt 3**

> open http://127.0.0.1:5174

**Prompt 4**

> can we change the website colors to be white and blue in align with yales colors?

**Prompt 5**

> (follow-up selection) Only restyle hw4 — leave AGENTS.md's black-and-pink rule as-is for other homeworks/web apps.

---

## Problem 4: Create Account and Login

**Prompt 1**

> okay let's move on to Problem 4: Create account and login
>
> Please build a normal create-account / login workflow
> create account should include: first name, last name, email, and password (add confirm password too)
> login: with email and passport
>
> New accounts will go to the users table. please make sure to store passwords securely so hackers (human or AI) cannot access them
>
> The seed database already includes a test user you can use while building
> email: test@campuscustoms.yale.edu
> Password: password
>
> Confirm you can login in as that user and that a brand-new account you create also works
>
> Update the output/harness.md with how the authentication works (what is stored for a user and how passwords are protected)

---

## Problem 5: PydanticAI Agent Backend

**Prompt 1**

> thank you! lets move on to problem 5: pydanticAI agent backend
>
> We need to build the shop chatbot as a pydanticAI agent behind FastAPI, plugged into our frontend chat widget. put the API app in backend/main.pd, this is the file you run with Uvicorn.
>
> Keep the agent as these four files next to it
>
> backend/prompts/prompt.md - system prompt
> backend/agent.py - agent entry / wiring
> backend/tools.py - tools the agent can call
> backend/models.py - Pydantic / PydanticAI structured types
>
> in main.py expose a chat route so a message from the website returns a reply from the agent (and whatever else you need for products/auth). we will need our AI model API key for the agent
>
> Put campus customs voice and safety basics into prompts/prompt.md. start or update types in models.py for chat replies / product cards as neeeded. In output/harness.md not how the front end talks to FastAPI and how the agent is loaded (prompt file + model)

**Prompt 2**

> Please make sure the backend runs from the backend/ folder like this: uvicorn main:app --reload --port 8000

**Prompt 3**

> you confirmed that the backend runs from a folder like this: uvicorn main:app --reload --port 8000

---

## Problem 6: Tools — Product Info and Stock

**Prompt 1**

> thank you! now lets move on to problem 6: tools: product info and stock
>
> Given the agent tools that look up real information from campus_customs.db
> product description
> price
> how many are in stock (by size when the customer asks)
>
> The agent must use the database it - should not invent prices and quantities. If a size is out of stock, say so clearly
>
> Expand prompts/prompt.md so the agent knows to call these tools for price and stock questions. add or update return types in models.py
>
> In output/harness.md list each tool and explain which model fields you chose for lookup results and why

**Prompt 2**

> have you updated all the AI_prompts.md?

---

## Problem 7: Chat Search That Updates the Page

**Prompt 1**

> thank you, we can now work on problem 7: chat search that updates the page
>
> Now we will add a neat feature to the site. when a customer asks about a type of item, for example "what hoodies do you have?" the agent should search the catalogue and the website should dynamically show those matching items as product cards (image, name, price, short info). This is an API contract: the agent returns structured product matches and then the front end renders them on the website.
>
> After the dynamic product cards are loaded by your new feature, make sure the same single-item page behavior you built in problem 3 still works. each product card - including the ones the chat just put on the page - should still open that detail view (large image + full info) when clicked
>
> Update prompts/prompt.md and output/harness.md so it is clear how search results reach the page

---

## Problem 8: Customer Memory

**Prompt 1**

> now lets work on problem 8: customer memory
>
> when a shopper is logged in, save their chat history in the database in an appropriate table and reload it when they return. the agent should know who is chatting (name, email) - put that in agent deps (or an equivalent clear pattern) and /or tools the agent can call
>
> also pass enough page context that if someone is on a product page and asks "do you have this in pink", the agent knows which item they mean
>
> Guests can still chat but the history only needs to persit for logged in users. Document in output/harness.md: how user chat history is store, what customers fields the agent sees, and how the papge context is passed

---

## Problem 9: Usability Improvements

**Prompt 1**

> let's move on to problem 9: usability improvements
>
> Chose and implement
> 2 front-end usability improvements
> 2 agent / backend usability improvements
>
> Front-end improvements are things that make the site look better and make it easier to use
>
> Agent / backend improvements are things that make the agent output better, more accurate, or safer. These could be new agent tools or things that make the agent run faster or cheaper
>
> Write output/usability.md before or as you build. for each of the improvements say:
> what you added
> why it helps a campus customs shopper or the business
>
> then make sure all improvement actually show up in the running app. graders will read the write up and look for the features

**Prompt 2**

> please give me the front end link so i can provide some feedback for useability

**Prompt 3**

> open http://127.0.0.1:5174

**Prompt 4**

> instead of feels like yale can you say "you" also change the products link on the banner to Shop
>
> and change "shop the collection" to "shop"
>
> also the stock you can trust part - isn't relevant for a user
>
> maybe put the agent talk bubble in a more visable place

**Prompt 5**

> also the CC for campus customs in the left hand corner, can you put the yale logo there instead
>
> maybe put everyday bulldog gear and everu campus corner as side by side include a bulldog icon for everyday and a campus icon for the other one and underneath it you can have the "ask before you buy banner" and make it italicized

**Prompt 6**

> open http://127.0.0.1:5174

**Prompt 7**

> no im talking about moving the agent "chat with us" up to the banner that says "ask before you buy"

**Prompt 8**

> put it to the side and the language should be 1 line

**Prompt 9**

> the chatbot should understand that M = medium, L=large S=small etc

**Prompt 10**

> open http://127.0.0.1:5174

**Prompt 11**

> can you give me the updated frontend link, i want to test the chatbot

**Prompt 12**

> open http://127.0.0.1:5174

---

## Problem 10: Style the Website

**Prompt 1**

> [screenshot of "thisisneverthat®" wordmark and a Products grid showing card text amounts]
>
> Thank you! we will now move on to problem 10: Style the website.
>
> we will now be working on the creative design and feel of the Campus customs store front:
>
> Font: something big and catchy with thick letters like this photo so people can see it
> colors: yale blue and white given it is a yale store
> product presentation: please make sure the products are presented consistently: there should be 1 or 2 lines of text with price no large amounts of texts, also the title of the product should be 1 single line so the website doesn't look clunky - i want simple and clean where someone can quickly get the product they want
>
> please document all the website changes aboe within the output/design.md

**Prompt 2**

> open http://127.0.0.1:5174

**Prompt 3**

> [screenshot of the Products grid showing the new Archivo Black heading style and inconsistent product image cropping]
>
> i dont want the font black, i just want it to be that style but it needs to be blue
>
> also here please say "Shop All"
>
> and instead of "Fresh off the shelf," say "New to our collection"
>
> also on the shop all page: these product images and box sizes need to be consistent:
> [screenshot of a product grid example with uniform image framing]

**Prompt 4**

> [screenshot of the "See everything →" link on Home]
>
> this should say "Shop All"

**Prompt 5**

> for this line "We check real stock before we answer — no guessing." connect with us before committing: chat with us and know everything you need to know before buying

**Prompt 6**

> thank you! please make sure you'd also updated output/design.md with all my requests

---

## Problem 11: Site Testing (App Check)

**Prompt 1**

> Now for problem 11: site testing (app check) we need to test the live site and document it in output/app_check.html (a page we can double-click and open. we will include clear screenshots and short captions for:
>
> 1. chat checking the inventory level of an item. (honest stock / price from the database
> 2. the dynamic search-result cards appearing after. a category question e.g., hoodies
> 3. one of the usability features we added in problem 9

**Prompt 2**

> Make the HTML easy to grade: heading for each check, screenshot, and one or two sentences on what the screenshot proces. Put the screneshot image files in output/app_check_images/ and link them from app_check.html with relative paths (for example app_check_image/inventory.png)

---

## Problem 12: Audit Trail, Safety, and Finish Harness

**Prompt 1**

> thank you! for problem 12: audit trail, safety, and finish harness
>
> lets create an append-only output/audit_trail.json of agent-loop activity (time, tool name, short args/result, stop reason). do not wipe it between runs. Also think of some safety rules to give to the agent and put them in prompts/prompt.md
>
> Finish output/harness.md so it is clear how the system works. Model fields in models.py and why you chose them
> tools and abilities
> safety rules
> specs (loop limits, result caps, models, how to run front + backend)

**Prompt 2**

> i am thinking about safety rules for the agent - things like only provide information that is true e.g., inventory and clothing types - refer to the database and don't do research outside of that

---

## Shopping Cart (ad hoc feature, outside the numbered problems)

**Prompt 1**

> i also noticed there is no "add to shopping cart" button, can we create a shopping cart?

**Prompt 2**

> [screenshot of the "Ask Before You Buy" banner, text truncated]
>
> also for this: please put the "chat with us on the felt hand side, then just put connect with us before committing"

**Prompt 3**

> the connect with us before committing should be right next to the chat with us button, it looks weird with all the spacing

**Prompt 4**

> [screenshot of the garment-type filter dropdown, showing 22 granular raw catalog values]
>
> i think these can be consolidated a little e.g., crewneck and crewneck sweatshirt are the same thing
>
> pullover hoodie, quarter-zip pullover and pullover sweatshirt are all the same and should fall within pullover
>
> also all t-shirts should be in 1 group called t-shirts regardless if short-sleeve crew neck
>
> hoodies should include hooded pullover, hooded sweatshet and hooodies

---

## Problem 13: Push to GitHub

**Prompt 1**

> [expected file layout diagrams and local-only data pack diagram]
>
> for problem 13, we need to put the folder in the hw4 and push it to a public github repository.
>
> please don't put our real .env, campus_customs.db or product images in the GitHub repo. use .gitignore and include an .env.example with placeholders only
>
> the local-only data pack (not included in the git) should look like this.
>
> the agent itself is four files under backend/: prompts/prompt.md, agent.py, tools.py, and models.py
>
> README.md should explain how to run the front end and back end after placing the data pack

**Prompt 2**

> this is the url, my user name is rachelfogg85: https://github.com/

**Prompt 3**

> where do i make the repo

**Prompt 4**

> [screenshot of Rachel's GitHub Repositories page]

**Prompt 5**

> (follow-up selection) Done, it's created — confirming the empty "campus-customs" repo was created on GitHub.

**Prompt 6**

> [Rachel pasted her GitHub personal access token directly into the chat. Redacted here and not reproduced — she was told to treat it as compromised and revoke it immediately, since pasting it here exposed it outside her own terminal.]

**Prompt 7**

> i put it in the terminal too

**Prompt 8**

> i made a new token, where should i put it

**Prompt 9**

> it hasnt asked me

**Prompt 10**

> git push -u origin main

**Prompt 11**

> i did

**Prompt 12**

> git push -u origin main

**Prompt 13**

> cd "/Users/rachelfogg/Documents/Yale/Fall 1/MGT 409_AI Foundations for Managers/hw4" && git push -u origin main

**Prompt 14**

> i did

**Prompt 15**

> did you update AI_prompts.md?

---

## Plain-English Project Summary (ad hoc, outside the numbered problems)

**Prompt 1**

> can you please create a white up for me to better understand everything that happened between problems 1-13 in laymen terms

**Prompt 2**

> the things called "a few things that happened outside" should be included in problem 9 as they are related to the look and feel of the website

**Prompt 3**

> thank you, please make sure to document this all within the AI_prompts.md

---


