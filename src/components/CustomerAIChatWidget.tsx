import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  MessageSquare,
  X,
  Send,
  ShoppingBag,
  CheckCircle2,
  Clock,
  ChefHat,
  Utensils,
  Trash2,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { useEcosystem, handleFoodImageError } from '../context/EcosystemContext.tsx';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  suggestedPrompts?: string[];
  recommendedItems?: {
    id: string;
    name: string;
    price: number;
    prepTimeMinutes: number;
    category: string;
    image: string;
    isAvailable: boolean;
  }[];
  confirmAddToCart?: {
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    confirmed?: boolean;
    dismissed?: boolean;
  } | null;
  activeOrderSummary?: {
    tokenNumber: string;
    status: string;
    orderType: 'DINE_IN' | 'TAKEAWAY';
    assignedChefName: string;
    tableOrCounter: string;
    estimatedPrepMinutes: number;
  } | null;
}

const INITIAL_PROMPTS = [
  'Recommend popular dishes',
  'Show veg dishes under $7',
  'Track my live order & chef',
  'Fastest dishes to prepare',
  'Dine-In vs Takeaway help',
  'How does PayPal payment work?',
];

export const CustomerAIChatWidget: React.FC = () => {
  const {
    snapshot,
    currentUser,
    orderType,
    selectedTable,
    addToCart,
    showToast,
  } = useEcosystem();

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-ai',
      sender: 'ai',
      text: `Hello ${
        currentUser?.name?.split(' ')[0] || 'there'
      }! I am **FEEDO Customer AI**, your personal dining, payment & live order assistant.\n\nI can recommend dishes based on your budget or preparation time, compare items, guide you through **Dine-In vs Takeaway** and **PayPal Checkout**, or track your live order token and assigned chef.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedPrompts: INITIAL_PROMPTS,
    },
  ]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isTyping]);

  const sendPrompt = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || isTyping) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/ai/customer-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id || 'usr-customer-1',
          userName: currentUser?.name || 'Aarav Sharma',
          message: trimmed,
          selectedOrderType: orderType,
          selectedTableNumber: selectedTable,
        }),
      });
      const data = await res.json();

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text:
          data.reply ||
          'Here are the latest updates from the FEEDO Smart Canteen menu and kitchen.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedPrompts: data.suggestedPrompts || INITIAL_PROMPTS.slice(0, 4),
        recommendedItems: data.recommendedItems || [],
        confirmAddToCart: data.confirmAddToCart || null,
        activeOrderSummary: data.activeOrderSummary || null,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'ai',
          text: 'I encountered a temporary connection issue. Please try asking again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedPrompts: INITIAL_PROMPTS.slice(0, 3),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleConfirmCartAdd = (msgId: string, menuItemId: string, quantity: number) => {
    const item = snapshot?.menuItems.find((m) => m.id === menuItemId);
    if (!item) {
      showToast('Item not found', 'Could not locate dish in menu', 'red');
      return;
    }
    addToCart(item, quantity);
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m.confirmAddToCart
          ? {
              ...m,
              confirmAddToCart: { ...m.confirmAddToCart, confirmed: true },
            }
          : m
      )
    );
  };

  const handleDismissCartAdd = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m.confirmAddToCart
          ? {
              ...m,
              confirmAddToCart: { ...m.confirmAddToCart, dismissed: true },
            }
          : m
      )
    );
  };

  const clearConversation = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'ai',
        text: `Conversation cleared! How can **FEEDO Customer AI** help you with your meal, table reservation, or live order today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedPrompts: INITIAL_PROMPTS,
      },
    ]);
  };

  return (
    <>
      {/* Floating AI Launcher Button */}
      <div className="fixed bottom-6 right-6 z-40">
        {!isOpen ? (
          <button
            onClick={() => setIsOpen(true)}
            data-testid="open-customer-ai-btn"
            className="group flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-emerald-950 hover:bg-emerald-900 text-ivory-50 shadow-2xl border border-emerald-700/60 transition-all hover:scale-[1.02]"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-800/80 border border-emerald-500/40 flex items-center justify-center relative">
              <Sparkles className="w-5 h-5 text-gold-300" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-green-400 ring-2 ring-emerald-950" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold tracking-wide flex items-center gap-1.5">
                FEEDO Customer AI
                <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-emerald-800 text-emerald-100">
                  Live
                </span>
              </div>
              <div className="text-[11px] text-emerald-200/80">
                Menu, PayPal & Live Token Assistant
              </div>
            </div>
          </button>
        ) : null}
      </div>

      {/* Conversational AI Drawer / Panel */}
      {isOpen && (
        <div
          data-testid="customer-ai-panel"
          className="fixed bottom-6 right-6 z-50 w-[94vw] sm:w-[430px] max-h-[82vh] h-[640px] bg-white rounded-3xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden animate-fade-in"
        >
          {/* Header */}
          <div className="bg-emerald-950 text-ivory-50 px-5 py-4 flex items-center justify-between border-b border-emerald-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-800/90 border border-emerald-600/40 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-gold-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-bold text-sm text-white">
                    FEEDO Customer AI
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-800 text-emerald-100 border border-emerald-700">
                    Personal Assistant
                  </span>
                </div>
                <p className="text-[11px] text-emerald-200/80 flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="w-3 h-3 text-green-400" />
                  Scoped to {currentUser?.name || 'Customer'} •{' '}
                  {orderType === 'DINE_IN'
                    ? `Dine-In (Table #${selectedTable || 'Unselected'})`
                    : 'Takeaway Mode'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={clearConversation}
                title="Clear conversation"
                className="p-2 rounded-xl text-emerald-200 hover:text-white hover:bg-emerald-900 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close AI Assistant"
                className="p-2 rounded-xl text-emerald-200 hover:text-white hover:bg-emerald-900 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-ivory-50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-emerald-900 text-white rounded-br-xs'
                      : 'bg-white text-stone-800 border border-stone-200/90 rounded-bl-xs'
                  }`}
                >
                  <div className="whitespace-pre-line">
                    {msg.text.split('**').map((part, idx) =>
                      idx % 2 === 1 ? (
                        <strong key={idx} className="font-bold">
                          {part}
                        </strong>
                      ) : (
                        <span key={idx}>{part}</span>
                      )
                    )}
                  </div>

                  {/* Active Order Summary Card inside AI response */}
                  {msg.activeOrderSummary && (
                    <div className="mt-3 p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 text-stone-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900">
                          Live Token {msg.activeOrderSummary.tokenNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-900 text-white">
                          {msg.activeOrderSummary.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                        <div className="flex items-center gap-1.5 text-stone-700">
                          <ChefHat className="w-3.5 h-3.5 text-emerald-800 shrink-0" />
                          <span className="truncate font-semibold">
                            {msg.activeOrderSummary.assignedChefName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-stone-700">
                          <Utensils className="w-3.5 h-3.5 text-emerald-800 shrink-0" />
                          <span className="truncate font-semibold">
                            {msg.activeOrderSummary.tableOrCounter}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-900 font-semibold pt-0.5">
                        <Clock className="w-3.5 h-3.5" />
                        Est. Wait: {msg.activeOrderSummary.estimatedPrepMinutes} mins
                      </div>
                    </div>
                  )}

                  {/* Explicit Customer Confirmation Before Adding to Cart */}
                  {msg.confirmAddToCart && (
                    <div className="mt-3 p-3 rounded-xl bg-ivory-100 border border-emerald-300 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-950">
                          Confirm Cart Addition
                        </span>
                        <span className="text-[11px] font-mono font-bold text-emerald-800">
                          {msg.confirmAddToCart.quantity}x • $
                          {(
                            msg.confirmAddToCart.price * msg.confirmAddToCart.quantity
                          ).toFixed(2)}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-600">
                        Add <strong>{msg.confirmAddToCart.quantity}x {msg.confirmAddToCart.name}</strong> (+5% GST at checkout) to your cart?
                      </p>
                      {msg.confirmAddToCart.confirmed ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-50 px-2.5 py-1.5 rounded-lg border border-green-200">
                          <CheckCircle2 className="w-4 h-4" />
                          Confirmed & Added to Cart
                        </div>
                      ) : msg.confirmAddToCart.dismissed ? (
                        <div className="text-[11px] text-stone-500 italic">
                          Addition cancelled.
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() =>
                              handleConfirmCartAdd(
                                msg.id,
                                msg.confirmAddToCart!.menuItemId,
                                msg.confirmAddToCart!.quantity
                              )
                            }
                            className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-900 hover:bg-emerald-800 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            Confirm & Add
                          </button>
                          <button
                            onClick={() => handleDismissCartAdd(msg.id)}
                            className="py-1.5 px-3 rounded-lg bg-white hover:bg-stone-100 text-stone-600 border border-stone-200 font-semibold text-[11px]"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Recommended Dish Cards */}
                  {msg.recommendedItems && msg.recommendedItems.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {msg.recommendedItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2.5 p-2 rounded-xl bg-ivory-50 border border-stone-200/90"
                        >
                          <img
                            src={item.image}
                            alt={item.name}
                            onError={handleFoodImageError}
                            className="w-11 h-11 rounded-lg object-cover shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-[11px] text-stone-900 truncate">
                              {item.name}
                            </div>
                            <div className="text-[10px] text-stone-500 flex items-center gap-2">
                              <span className="font-bold text-emerald-900">
                                ${item.price.toFixed(2)}
                              </span>
                              <span>• {item.prepTimeMinutes}m prep</span>
                            </div>
                          </div>
                          <button
                            onClick={() => sendPrompt(`Add 1 ${item.name} to my cart`)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-[10px] border border-emerald-200 shrink-0 transition-colors"
                          >
                            + Select
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <span className="text-[10px] text-stone-400 mt-1 px-1">{msg.timestamp}</span>

                {/* Suggested Follow-Up Chips */}
                {msg.sender === 'ai' &&
                  msg.suggestedPrompts &&
                  msg.suggestedPrompts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2 max-w-[95%]">
                      {msg.suggestedPrompts.map((prompt, idx) => (
                        <button
                          key={idx}
                          onClick={() => sendPrompt(prompt)}
                          className="text-[11px] px-2.5 py-1 rounded-full bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-200/80 font-medium transition-colors flex items-center gap-1 shadow-2xs"
                        >
                          <span>{prompt}</span>
                          <ChevronRight className="w-3 h-3 text-emerald-600" />
                        </button>
                      ))}
                    </div>
                  )}
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 text-xs text-stone-500 bg-white px-4 py-2.5 rounded-2xl border border-stone-200 w-fit">
                <Sparkles className="w-3.5 h-3.5 text-emerald-800 animate-spin" />
                <span>FEEDO Customer AI is analyzing live menu & kitchen state...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendPrompt(input);
            }}
            className="p-3 bg-white border-t border-stone-200 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about dishes, under $8, track order, or PayPal..."
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-ivory-50 border border-stone-200 text-xs text-stone-800 focus:outline-none focus:border-emerald-700"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="p-2.5 rounded-xl bg-emerald-900 hover:bg-emerald-800 disabled:opacity-40 text-white transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
