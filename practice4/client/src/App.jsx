import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API = "http://localhost:3000/api/products";

const CATEGORIES = [
  { value: "clothes", label: "clothes" },
  { value: "shoes", label: "shoes" },
  { value: "sport clothes", label: "sport clothes" },
  { value: "accessories", label: "accessories" },
  { value: "other", label: "other" }
];

export default function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    price: "",
    category: "other",
    description: "",
    image: "",
    link: ""
  });

  const canSubmit = useMemo(() => {
    const nameOk = form.name.trim().length > 0;
    const priceOk = String(form.price).trim().length > 0 && !Number.isNaN(Number(form.price));
    const categoryOk = CATEGORIES.some((c) => c.value === form.category);
    return nameOk && priceOk && categoryOk;
  }, [form.name, form.price, form.category]);

  async function loadProducts() {
    try {
      setLoading(true);
      const res = await fetch(API);
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
      setError("");
    } catch {
      setError("Не удалось загрузить товары");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  function openModal() {
    setForm({
      name: "",
      price: "",
      category: "other",
      description: "",
      image: "",
      link: ""
    });
    setError("");
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
  }

  function onChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      setError("");

      const payload = {
        name: form.name.trim(),
        price: Number(form.price),
        category: form.category,
        description: form.description.trim(),
        image: form.image.trim(),
        link: form.link.trim()
      };

      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const msg = await res.json().catch(() => ({}));
        throw new Error(msg?.message || "Ошибка добавления товара");
      }

      const created = await res.json();
      setProducts((prev) => [created, ...prev]);
      closeModal();
    } catch (err) {
      setError(err.message || "Ошибка добавления товара");
    }
  }

  return (
    <div className="page">
      <div className="container">
        <div className="header">
          <div className="title">
            <h1>Интернет-магазин</h1>
            <p>Карточки товаров загружаются из API и добавляются через форму</p>
          </div>

          <div className="actions">
            <button className="btn" onClick={openModal}>
              Добавить товар
            </button>
          </div>
        </div>

        {loading && <div className="stateBox">Загрузка...</div>}
        {!loading && error && <div className="stateBox">{error}</div>}

        <div className="grid">
          {products.map((p) => (
            <div className="card" key={p.id}>
              <div className="media">
                {p.image ? (
                  <img src={p.image} alt={p.name} />
                ) : (
                  <div className="placeholder">Нет изображения</div>
                )}
              </div>

              <div className="body">
                <div className="name">{p.name}</div>
                {p.description && <div className="desc">{p.description}</div>}

                <div className="metaRow">
                  <div className="price">${p.price}</div>
                  {p.category && <div className="badge">{p.category}</div>}
                </div>

                {p.link && (
                  <a className="linkBtn" href={p.link} target="_blank" rel="noreferrer">
                    Открыть
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && (
        <div className="backdrop" onMouseDown={closeModal}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modalHead">
              <div className="modalTitle">Добавить товар</div>
              <button className="iconBtn" onClick={closeModal} aria-label="close">
                ×
              </button>
            </div>

            <form className="form" onSubmit={onSubmit}>
              <label className="label">
                Название:
                <input className="input" name="name" value={form.name} onChange={onChange} />
              </label>

              <label className="label">
                Цена ($):
                <input
                  className="input"
                  name="price"
                  value={form.price}
                  onChange={onChange}
                  inputMode="decimal"
                />
              </label>

              <label className="label">
                Категория:
                <select className="input" name="category" value={form.category} onChange={onChange}>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="label">
                Описание:
                <textarea
                  className="textarea"
                  name="description"
                  value={form.description}
                  onChange={onChange}
                  rows={4}
                />
              </label>

              <label className="label">
                Ссылка на фото (URL):
                <input className="input" name="image" value={form.image} onChange={onChange} />
              </label>

              <label className="label">
                Ссылка на товар (необязательно):
                <input className="input" name="link" value={form.link} onChange={onChange} />
              </label>

              {error && <div className="stateBox">{error}</div>}

              <div className="formRow">
                <button type="button" className="btnGhost" onClick={closeModal}>
                  Отмена
                </button>
                <button
                  type="submit"
                  className="btn"
                  disabled={!canSubmit}
                  style={{ opacity: canSubmit ? 1 : 0.55 }}
                >
                  Добавить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}