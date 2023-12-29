import Link from "next/link";
import { Item } from "../../../shared/types";
import { IMAGES_URL } from "../../../shared/api";
import Image from "next/image";

export default function ItemListingCard({ item }: { item: Item }) {
  return (
    <Link href={`/item/${item.id}`}>
      <div className="flex flex-col gap-y-2">
        <Image
          src={`${IMAGES_URL}${item.images[0]}`}
          alt={item.name}
          width={300}
          height={300}
        />
        <p>
          {item.name} - {item.price}
        </p>
      </div>
    </Link>
  );
}
